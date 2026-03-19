import { verifyToken, getInstagramAccount } from "@/lib/meta";

export async function GET() {
  try {
    const tokenInfo = await verifyToken();
    const instagramAccount = await getInstagramAccount();

    return Response.json({
      valid: true,
      instagramAccountId: instagramAccount.id ?? null,
      instagramUsername: instagramAccount.username ?? null,
      profilePicUrl: instagramAccount.profilePicUrl ?? null,
      followerCount: instagramAccount.followersCount ?? null,
      tokenExpiresIn: tokenInfo.expiresIn ?? null,
    });
  } catch (error) {
    console.error("Failed to verify Meta connection:", error);
    return Response.json(
      {
        valid: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to verify Meta connection",
      },
      { status: 401 }
    );
  }
}
