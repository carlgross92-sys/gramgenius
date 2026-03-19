# Meta / Instagram Graph API Setup Guide

Complete step-by-step guide for connecting GramGenius to the Instagram Graph API for automated publishing, analytics, and comment management.

---

## Prerequisites

Before you begin, make sure you have:

- An **Instagram Business** or **Instagram Creator** account (Personal accounts do not support the Graph API)
- A **Facebook Page** linked to your Instagram account
  - Go to your Instagram app → Settings → Account → Linked Accounts → Facebook → connect to your Page
  - Or in Facebook Page Settings → Instagram → Connect Account
- A **Meta (Facebook) account** that has admin access to the Facebook Page

---

## Step 1: Create a Facebook Developer Account

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Click **Get Started** (top right)
3. Log in with the Facebook account that owns/admins the linked Facebook Page
4. Accept the Meta Platform Terms and Developer Policies
5. Verify your account with a phone number or credit card if prompted
6. Your Developer Dashboard is now active

---

## Step 2: Create a New App

1. From the Developer Dashboard, click **Create App**
2. Select **Other** as the use case, then click **Next**
3. Select app type: **Business**
4. Fill in the details:
   - **App Name**: `GramGenius` (or any name you prefer)
   - **App Contact Email**: your email
   - **Business Account**: select your business account, or skip if you don't have one
5. Click **Create App**
6. Once the app is created, go to the **App Dashboard**
7. In the left sidebar under **Add Products**, find **Instagram Graph API** and click **Set Up**
8. The Instagram Graph API product is now added to your app

---

## Step 3: Configure Permissions

Your app needs the following permissions (scopes) to work with GramGenius:

| Permission | Purpose |
|---|---|
| `instagram_basic` | Read profile info and media |
| `instagram_content_publish` | Publish posts, reels, carousels, and stories |
| `instagram_manage_comments` | Read and reply to comments |
| `pages_read_engagement` | Read Page engagement data |
| `pages_manage_posts` | Manage posts on linked Facebook Page |
| `pages_show_list` | List Pages you manage (needed to find Page ID) |

To configure these:

1. In your app dashboard, go to **App Review → Permissions and Features**
2. For each permission above, click **Request** (some may already be available in Development mode)
3. While in **Development Mode**, these permissions work for app admins/testers without formal review
4. For production use with other users, you will need to submit each permission for **App Review**

> **Note**: In Development Mode, the API only works for users listed as admins, developers, or testers in your app's Roles settings. This is fine for personal use with GramGenius.

---

## Step 4: Generate a Short-Lived User Access Token

1. Go to [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. In the top-right dropdown, select your **GramGenius** app
3. Click the **User Token** dropdown and select **Get User Access Token**
4. In the permissions dialog, check all the permissions from Step 3:
   - `instagram_basic`
   - `instagram_content_publish`
   - `instagram_manage_comments`
   - `pages_read_engagement`
   - `pages_manage_posts`
   - `pages_show_list`
5. Click **Generate Access Token**
6. A Facebook login dialog will appear — approve the permissions
7. Copy the generated token — this is your **short-lived token** (valid ~1-2 hours)

---

## Step 5: Exchange for a Long-Lived Token (60 Days)

Short-lived tokens expire in about 1-2 hours. Exchange it for a **long-lived token** that lasts 60 days.

Make this GET request (replace the placeholder values):

```
GET https://graph.facebook.com/v21.0/oauth/access_token
  ?grant_type=fb_exchange_token
  &client_id={YOUR_APP_ID}
  &client_secret={YOUR_APP_SECRET}
  &fb_exchange_token={SHORT_LIVED_TOKEN}
```

**Using curl:**

```bash
curl -X GET "https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=YOUR_APP_ID&client_secret=YOUR_APP_SECRET&fb_exchange_token=YOUR_SHORT_LIVED_TOKEN"
```

**Where to find your App ID and App Secret:**

1. Go to your app's dashboard at developers.facebook.com
2. In the left sidebar, go to **Settings → Basic**
3. **App ID** is displayed at the top
4. Click **Show** next to **App Secret** (you'll need to re-enter your Facebook password)

**Response:**

```json
{
  "access_token": "EAAG...your-long-lived-token",
  "token_type": "bearer",
  "expires_in": 5184000
}
```

The `expires_in` value of `5184000` = 60 days in seconds.

**Save this long-lived access token** — you will paste it into GramGenius.

---

## Step 6: Get Your Facebook Page ID

Using your new long-lived token, make this request:

```
GET https://graph.facebook.com/v21.0/me/accounts?access_token={LONG_LIVED_TOKEN}
```

**Using curl:**

```bash
curl -X GET "https://graph.facebook.com/v21.0/me/accounts?access_token=YOUR_LONG_LIVED_TOKEN"
```

**Response:**

```json
{
  "data": [
    {
      "access_token": "EAAG...page-access-token",
      "category": "Software",
      "name": "Your Page Name",
      "id": "123456789012345"
    }
  ]
}
```

Copy the `id` value — this is your **Facebook Page ID**.

> If you manage multiple Pages, find the one linked to your Instagram account.

---

## Step 7: Get Your Instagram Business Account ID

Using your Facebook Page ID from Step 6:

```
GET https://graph.facebook.com/v21.0/{PAGE_ID}?fields=instagram_business_account&access_token={LONG_LIVED_TOKEN}
```

**Using curl:**

```bash
curl -X GET "https://graph.facebook.com/v21.0/123456789012345?fields=instagram_business_account&access_token=YOUR_LONG_LIVED_TOKEN"
```

**Response:**

```json
{
  "instagram_business_account": {
    "id": "17841400123456789"
  },
  "id": "123456789012345"
}
```

Copy the `instagram_business_account.id` value — this is your **Instagram Business Account ID**.

> If `instagram_business_account` is missing from the response, your Instagram account is not properly linked to this Facebook Page, or it is a Personal (not Business/Creator) account. See Troubleshooting below.

---

## Step 8: Enter Values in GramGenius

1. Open GramGenius in your browser
2. Navigate to the **Settings** page
3. In the **Instagram / Meta API** section, enter:
   - **Instagram Business Account ID**: the ID from Step 7 (e.g., `17841400123456789`)
   - **Long-Lived Access Token**: the token from Step 5
4. Click **Save**
5. GramGenius will verify the connection and display your linked Instagram account info

---

## Step 9: Token Renewal

Long-lived tokens expire after **60 days**. Here's what you need to know:

### Automatic Refresh

Long-lived tokens can be refreshed before they expire (but only if they are at least 24 hours old):

```
GET https://graph.facebook.com/v21.0/oauth/access_token
  ?grant_type=fb_exchange_token
  &client_id={YOUR_APP_ID}
  &client_secret={YOUR_APP_SECRET}
  &fb_exchange_token={CURRENT_LONG_LIVED_TOKEN}
```

This returns a new long-lived token with a fresh 60-day window.

### When to Refresh

- GramGenius will display a warning in Settings when your token is within 7 days of expiring
- If your token expires, publishing and analytics features will stop working
- You can always generate a fresh token by repeating Steps 4 and 5

### Best Practices

- Set a calendar reminder for 50 days after generating a new token
- Keep your App Secret secure — never expose it in client-side code
- Consider storing the token renewal date so you can proactively refresh

---

## Step 10: Troubleshooting Common Errors

### "Invalid OAuth access token"

- Your token has expired. Generate a new one via Steps 4-5.
- Make sure you're using the long-lived token, not the short-lived one.

### "instagram_business_account" field is missing

- Your Instagram account is not a Business or Creator account. Switch it in the Instagram app: Settings → Account → Switch to Professional Account.
- Your Instagram account is not linked to the Facebook Page. Re-link it via Instagram Settings → Account → Linked Accounts → Facebook.

### "(#10) Application does not have permission"

- You're missing a required permission. Go back to Step 3 and ensure all six permissions are granted.
- In Development mode, make sure your Facebook user is added as a tester/admin in the app's Roles settings.

### "(#100) Invalid parameter - you must provide a valid Page ID"

- Double-check the Page ID from Step 6.
- Make sure you're using the Facebook Page ID, not the Instagram Account ID.

### "Media posted before business account conversion is not accessible"

- Only media posted after switching to a Business/Creator account is available via the API. Older posts cannot be accessed.

### "(#9004) There was a timeout while processing the request"

- This is a temporary Meta server issue. Wait a few minutes and retry.
- If it persists, check [Meta Platform Status](https://metastatus.com/) for outages.

### "The user has not authorized application {APP_ID}"

- Re-authorize by repeating Step 4 (generate a new token with all permissions).

### Publishing fails with "(#36003) The image is not supported"

- Instagram requires images to be JPEG format, between 320px and 1440px wide, and with an aspect ratio between 4:5 and 1.91:1.
- File size must be under 8MB.

### Rate Limiting

- The Instagram Graph API has rate limits (typically 200 calls per hour per user).
- GramGenius respects these limits, but if you see rate limit errors, reduce publishing frequency or wait before retrying.

---

## Quick Reference

| Item | Where to Find It |
|---|---|
| App ID | developers.facebook.com → Your App → Settings → Basic |
| App Secret | developers.facebook.com → Your App → Settings → Basic (click Show) |
| Short-Lived Token | Graph API Explorer (valid ~1 hour) |
| Long-Lived Token | Exchange short-lived token via Step 5 (valid 60 days) |
| Facebook Page ID | `GET /me/accounts` response → `data[].id` |
| Instagram Business Account ID | `GET /{PAGE_ID}?fields=instagram_business_account` response |
| API Version | v21.0 (update as newer versions release) |
