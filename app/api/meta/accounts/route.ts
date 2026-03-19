import { verifyToken, getInstagramAccount } from "@/lib/meta";

export async function GET() {
  try {
    const tokenInfo = await verifyToken();

    if (!tokenInfo) {
      return Response.json(
        { error: "Invalid or expired Meta token" },
        { status: 401 }
      );
    }

    const instagramAccount = await getInstagramAccount();

    const accounts = [
      {
        platform: "instagram",
        id: instagramAccount.id ?? null,
        username: instagramAccount.username ?? null,
        profilePicUrl: instagramAccount.profilePicUrl ?? null,
        followerCount: instagramAccount.followersCount ?? null,
      },
    ];

    return Response.json({ accounts });
  } catch (error) {
    console.error("Failed to list Meta accounts:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to list Meta accounts",
      },
      { status: 500 }
    );
  }
}
