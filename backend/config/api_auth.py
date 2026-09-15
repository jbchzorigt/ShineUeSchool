"""
Админ дашбоардын нэвтрэлтийн API.

  POST /api/auth/token/          {"username", "password"} → {"access", "refresh"}
  POST /api/auth/token/refresh/  {"refresh"}              → {"access", "refresh"}
  GET  /api/auth/me/             Bearer токентой         → нэвтэрсэн хэрэглэгчийн мэдээлэл
"""

from django.urls import path
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    u = request.user
    return Response({
        "id": u.id,
        "username": u.username,
        "full_name": u.get_full_name() or u.username,
        "email": u.email,
        "is_staff": u.is_staff,
        "is_superuser": u.is_superuser,
    })


urlpatterns = [
    path("token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("me/", me, name="auth_me"),
]
