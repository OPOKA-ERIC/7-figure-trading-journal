import secrets
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status

from app.models.user import User
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token
from app.schemas.auth import RegisterRequest, LoginRequest
from app.core.config import settings


async def register_user(db: AsyncSession, data: RegisterRequest) -> User:
    # Check email not already taken
    result = await db.execute(select(User).where(User.email == data.email.lower()))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists",
        )

    verification_token = secrets.token_urlsafe(32)

    user = User(
        email=data.email.lower(),
        password_hash=hash_password(data.password),
        display_name=data.display_name,
        verification_token=verification_token,
        email_verified=False,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Send verification email
    await send_verification_email(user.email, user.display_name, verification_token)

    return user


async def login_user(db: AsyncSession, data: LoginRequest) -> dict:
    result = await db.execute(
        select(User).where(User.email == data.email.lower(), User.deleted_at == None)
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    if not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email before logging in",
        )

    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": user,
    }


async def verify_email(db: AsyncSession, token: str) -> User:
    result = await db.execute(
        select(User).where(User.verification_token == token)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification link",
        )

    user.email_verified = True
    user.verification_token = None
    await db.commit()
    await db.refresh(user)
    return user


async def forgot_password(db: AsyncSession, email: str) -> None:
    result = await db.execute(
        select(User).where(User.email == email.lower(), User.deleted_at == None)
    )
    user = result.scalar_one_or_none()

    # Always return success — never reveal if email exists
    if not user:
        return

    reset_token = secrets.token_urlsafe(32)
    user.reset_token = reset_token
    user.reset_token_expires = datetime.now(timezone.utc) + timedelta(hours=1)
    await db.commit()

    await send_password_reset_email(user.email, user.display_name, reset_token)


async def reset_password(db: AsyncSession, token: str, new_password: str) -> None:
    result = await db.execute(
        select(User).where(User.reset_token == token)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset link",
        )

    if user.reset_token_expires is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset link",
        )

    # Handle both timezone-aware and timezone-naive datetimes from DB
    expires = user.reset_token_expires
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    
    if expires < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset link has expired. Please request a new one.",
        )

    user.password_hash = hash_password(new_password)
    user.reset_token = None
    user.reset_token_expires = None
    await db.commit()


async def refresh_access_token(db: AsyncSession, refresh_token: str) -> str:
    from app.core.security import decode_token
    payload = decode_token(refresh_token)

    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    user_id = payload.get("sub")
    result = await db.execute(
        select(User).where(User.id == user_id, User.deleted_at == None)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return create_access_token({"sub": str(user.id)})


# ─── EMAIL HELPERS ────────────────────────────────────────────────────────────

async def send_verification_email(email: str, name: str, token: str) -> None:
    from app.core.config import settings

    verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"

    if settings.ENVIRONMENT == "development":
        print(f"\n{'='*60}")
        print(f"VERIFY EMAIL for {name} ({email})")
        print(f"URL: {verify_url}")
        print(f"TOKEN: {token}")
        print(f"{'='*60}\n")
        return

    # Production: SendGrid
    try:
        import ssl
        import certifi
        import sendgrid
        from sendgrid.helpers.mail import Mail
        ssl_context = ssl.create_default_context(cafile=certifi.where())
        sg = sendgrid.SendGridAPIClient(api_key=settings.SENDGRID_API_KEY)
        sg.client.session.verify = certifi.where()
        message = Mail(
            from_email="opokaeric9@gmail.com",
            to_emails=email,
            subject="Verify your 7 Figure Trading Journal account",
            html_content=f"""
            <h2>Welcome to 7 Figure Trading Journal, {name}!</h2>
            <p>Click the link below to verify your email address:</p>
            <a href="{verify_url}" style="background:#2E86C1;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;">
                Verify Email
            </a>
            <p>This link expires in 24 hours.</p>
            """,
        )
        sg.send(message)
    except Exception as e:
        print(f"Email send failed: {e}")


async def send_password_reset_email(email: str, name: str, token: str) -> None:
    from app.core.config import settings

    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"

    if settings.ENVIRONMENT == "development":
        print(f"\n{'='*60}")
        print(f"PASSWORD RESET for {name} ({email})")
        print(f"URL: {reset_url}")
        print(f"TOKEN: {token}")
        print(f"{'='*60}\n")
        return

    try:
        import certifi
        import sendgrid
        from sendgrid.helpers.mail import Mail
        sg = sendgrid.SendGridAPIClient(api_key=settings.SENDGRID_API_KEY)
        sg.client.session.verify = certifi.where()
        message = Mail(
            from_email="opokaeric9@gmail.com",
            to_emails=email,
            subject="Reset your 7 Figure Trading Journal password",
            html_content=f"""
            <h2>Password Reset Request</h2>
            <p>Hi {name}, click the link below to reset your password:</p>
            <a href="{reset_url}" style="background:#2E86C1;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;">
                Reset Password
            </a>
            <p>This link expires in 1 hour. If you did not request this, ignore this email.</p>
            """,
        )
        sg.send(message)
    except Exception as e:
        print(f"Email send failed: {e}")