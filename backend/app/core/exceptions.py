from fastapi import HTTPException, status


class AppException(HTTPException):
    """Base exception with error_code for structured error responses."""

    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR
    error_code: str = "ERROR"

    def __init__(self, detail: str, error_code: str = None, status_code: int = None):
        self.error_code = error_code or self.__class__.error_code
        super().__init__(
            status_code=status_code or self.__class__.status_code,
            detail=detail,
        )


class BadRequestError(AppException):
    status_code = status.HTTP_400_BAD_REQUEST
    error_code = "BAD_REQUEST"


class UnauthorizedError(AppException):
    status_code = status.HTTP_401_UNAUTHORIZED
    error_code = "UNAUTHORIZED"


class ForbiddenError(AppException):
    status_code = status.HTTP_403_FORBIDDEN
    error_code = "FORBIDDEN"


class NotFoundError(AppException):
    status_code = status.HTTP_404_NOT_FOUND
    error_code = "NOT_FOUND"
