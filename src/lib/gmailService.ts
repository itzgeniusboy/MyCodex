export interface GmailMessage {
  id: string;
  snippet: string;
  subject: string;
  from: string;
  date: string;
  bodyPreview: string;
}

// Fetch list of recent 8 emails
export async function fetchRecentEmails(accessToken: string): Promise<GmailMessage[]> {
  try {
    const listRes = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=8",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!listRes.ok) {
      throw new Error(`Gmail fetch list request failed with status: ${listRes.status}`);
    }

    const listData = await listRes.json();
    if (!listData.messages || listData.messages.length === 0) {
      return [];
    }

    // Detail fetch for header information
    const detailsPromises = listData.messages.map(async (msgItem: { id: string }) => {
      try {
        const detailRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgItem.id}?format=full`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
        if (!detailRes.ok) return null;
        const detail = await detailRes.json();

        // Extract headers
        const headers = detail.payload?.headers || [];
        const subjectHeader = headers.find((h: any) => h.name.toLowerCase() === "subject");
        const fromHeader = headers.find((h: any) => h.name.toLowerCase() === "from");
        const dateHeader = headers.find((h: any) => h.name.toLowerCase() === "date");

        return {
          id: detail.id,
          snippet: detail.snippet || "",
          subject: subjectHeader ? subjectHeader.value : "No Subject",
          from: fromHeader ? fromHeader.value : "Unknown Sender",
          date: dateHeader ? new Date(dateHeader.value).toLocaleString() : "Unknown Date",
          bodyPreview: detail.snippet || ""
        };
      } catch (innerErr) {
        console.error("Error fetching single message detail:", innerErr);
        return null;
      }
    });

    const parsedResults = await Promise.all(detailsPromises);
    return parsedResults.filter((item) => item !== null) as GmailMessage[];
  } catch (error) {
    console.error("Failed to fetch Gmail list:", error);
    throw error;
  }
}

// Send an email safely
export async function sendGmailMessage(
  accessToken: string,
  to: string,
  subject: string,
  bodyContent: string
): Promise<boolean> {
  try {
    // Construct valid RFC 2822 MIME message
    const rawMessage = [
      `To: ${to}`,
      "Content-Type: text/html; charset=utf-8",
      "MIME-Version: 1.0",
      `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
      "",
      `<p>${bodyContent.replace(/\n/g, "<br/>")}</p>`,
    ].join("\r\n");

    // base64url encode
    const base64Safe = btoa(unescape(encodeURIComponent(rawMessage)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const response = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          raw: base64Safe,
        }),
      }
    );

    if (!response.ok) {
      const errTxt = await response.text();
      console.error("Gmail Send API response failure:", errTxt);
      throw new Error(`Gmail send failed with status: ${response.status}`);
    }

    return true;
  } catch (err) {
    console.error("sendGmailMessage exception error:", err);
    throw err;
  }
}
