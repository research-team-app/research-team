from __future__ import annotations

import boto3
from botocore.exceptions import ClientError
from fastapi import APIRouter, Depends, HTTPException, status

from auth import require_self_user_id

resume_router = APIRouter(prefix="/resume")

AWS_REGION = "us-east-1"
S3_BUCKET_NAME = "rt-resumes"
PRESIGNED_PUT_TTL_SECONDS = 60 * 60
PRESIGNED_GET_TTL_SECONDS = 60 * 60

s3 = boto3.client("s3", region_name=AWS_REGION)

_ALLOWED_CONTENT_TYPES = {"application/pdf"}


@resume_router.post(
    "/{user_id}/presigned_put",
    summary="Create presigned PUT URL for CV/resume PDF upload",
    description="Returns a short-lived presigned PUT URL for direct S3 upload. Owner only. PDF only.",
)
def create_presigned_put(
    user_id: str,
    _: str = Depends(require_self_user_id),
):
    content_type = "application/pdf"
    key = f"{user_id}.pdf"

    try:
        upload_url = s3.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": S3_BUCKET_NAME,
                "Key": key,
                "ContentType": content_type,
            },
            ExpiresIn=PRESIGNED_PUT_TTL_SECONDS,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create presigned PUT URL: {e}",
        )

    try:
        preview_url = s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": S3_BUCKET_NAME, "Key": key},
            ExpiresIn=PRESIGNED_GET_TTL_SECONDS,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create presigned GET URL: {e}",
        )

    return {
        "upload_url": upload_url,
        "object_key": key,
        "preview_url": preview_url,
        "expires_in_seconds": PRESIGNED_PUT_TTL_SECONDS,
    }


@resume_router.get(
    "/{user_id}",
    summary="Get presigned URL to view a user's CV/resume PDF",
    description="Returns a short-lived presigned GET URL for the user's CV/resume. Returns presigned_url as null if not uploaded.",
)
def get_resume(user_id: str):
    key = f"{user_id}.pdf"
    try:
        s3.head_object(Bucket=S3_BUCKET_NAME, Key=key)
    except ClientError as e:
        code = e.response.get("Error", {}).get("Code")
        if code in ("404", "NoSuchKey", "NotFound"):
            return {"presigned_url": None}
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error accessing storage",
        )

    try:
        url = s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": S3_BUCKET_NAME, "Key": key},
            ExpiresIn=PRESIGNED_GET_TTL_SECONDS,
        )
        return {"presigned_url": url}
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create presigned URL",
        )


@resume_router.delete(
    "/{user_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete user's CV/resume PDF",
    description="Removes the PDF from S3. Owner only.",
)
def delete_resume(
    user_id: str,
    _: str = Depends(require_self_user_id),
):
    key = f"{user_id}.pdf"
    try:
        s3.delete_object(Bucket=S3_BUCKET_NAME, Key=key)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete resume: {e}",
        )
    return {"status": "deleted"}
