from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.core.config import settings
from app.models.user import User

router = APIRouter()


@router.post("/create-checkout")
async def create_checkout_session(
    current_user: User = Depends(get_current_user),
):
    """Create a Stripe Checkout session for Pro upgrade."""
    if not settings.STRIPE_SECRET_KEY or not settings.STRIPE_PRO_PRICE_ID:
        raise HTTPException(status_code=503, detail="Billing not configured")

    try:
        import stripe
        stripe.api_key = settings.STRIPE_SECRET_KEY

        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            mode="subscription",
            line_items=[{"price": settings.STRIPE_PRO_PRICE_ID, "quantity": 1}],
            success_url=f"{settings.FRONTEND_URL}/dashboard/settings?upgraded=1",
            cancel_url=f"{settings.FRONTEND_URL}/upgrade",
            customer_email=current_user.email,
            client_reference_id=str(current_user.id),
            subscription_data={
                "trial_period_days": 7,
                "metadata": {"user_id": str(current_user.id)},
            },
        )
        return {"checkout_url": session.url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stripe error: {str(e)}")


@router.post("/create-portal")
async def create_customer_portal(
    current_user: User = Depends(get_current_user),
):
    """Create a Stripe Customer Portal session for plan management."""
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Billing not configured")

    try:
        import stripe
        stripe.api_key = settings.STRIPE_SECRET_KEY

        # Find customer by email
        customers = stripe.Customer.list(email=current_user.email, limit=1)
        if not customers.data:
            raise HTTPException(status_code=404, detail="No billing account found")

        session = stripe.billing_portal.Session.create(
            customer=customers.data[0].id,
            return_url=f"{settings.FRONTEND_URL}/dashboard/settings",
        )
        return {"portal_url": session.url}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stripe error: {str(e)}")


@router.post("/webhook")
async def stripe_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Handle Stripe webhook events."""
    if not settings.STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="Webhook not configured")

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        import stripe
        stripe.api_key = settings.STRIPE_SECRET_KEY
        event = stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    event_type = event["type"]
    data = event["data"]["object"]

    if event_type in ("checkout.session.completed", "customer.subscription.updated"):
        # Activate Pro
        user_id = (
            data.get("client_reference_id") or
            data.get("metadata", {}).get("user_id")
        )
        if user_id:
            await _set_plan(db, user_id, "pro")

    elif event_type in ("customer.subscription.deleted", "invoice.payment_failed"):
        # Downgrade to free
        sub = data
        user_id = sub.get("metadata", {}).get("user_id")
        if not user_id:
            # Look up by customer email
            try:
                import stripe as s
                customer = s.Customer.retrieve(sub.get("customer", ""))
                result = await db.execute(
                    select(User).where(User.email == customer.email)
                )
                user = result.scalar_one_or_none()
                if user and not user.is_lifetime:
                    user.plan = "free"
                    await db.commit()
            except Exception:
                pass
        else:
            await _set_plan(db, user_id, "free")

    return {"received": True}


async def _set_plan(db: AsyncSession, user_id: str, plan: str):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user:
        if user.is_lifetime:
            return  # Never touch lifetime accounts
        user.plan = plan
        await db.commit()
