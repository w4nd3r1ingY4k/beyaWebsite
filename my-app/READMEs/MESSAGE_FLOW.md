{
  "ThreadId": "pm_bounces@pm-bounces.cal.com",
  "Timestamp": 1749728528909,
  "Body": "Your event has been scheduled\nWe sent an email to everyone with this information.\n\nWhat:\n30 Min Meeting between Danny Roosevelt and Akbar Shamji\n\nInvitee Time Zone:\nEurope/London\n\nWho:\nDanny Roosevelt - Organizer\ndanny@pipedream.com\nAkbar Shamji\nakbar@usebeya.com\n\nWhere:\nhttps://us06web.zoom.us/j/83099933732?pwd=ZTKtoadxaWVJWtA5ISKG0XtNNgkbBi.1\n\nAdditional notes:\nTo discuss Beya's usage of pipedream's MCP product!\n\nNeed to reschedule or cancel? https://cal.com/booking/6PS1n52rDuQGg6NgFbpqWB?changes=true",
  "category": "meeting-confirmation",
  "Channel": "email",
  "Direction": "incoming",
  "Headers": {
    "Message-ID": "<264faaf4-6e12-4a73-9c2b-2da382008a07@mtasv.net>",
    "From": "\"Danny Roosevelt\" <hello@cal.com>",
    "To": "\"Akbar Shamji\" <akbar@usebeya.com>",
    "Subject": "30 Min Meeting between Danny Roosevelt and Akbar Shamji"
  },
  "MessageId": "60413931-af2e-4b11-891e-3ab92c6f4ad2",
  "Result": null,
  "Subject": "30 Min Meeting between Danny Roosevelt and Akbar Shamji",
  "userId": "user-uuid-42"
}

into

{
  "eventId": "60413931-af2e-4b11-891e-3ab92c6f4ad2",
  "timestamp": "2025-07-12T14:22:08Z",
  "source": "platform",
  "orgId": "acme-org-uuid",
  "userId": "user-uuid-42",
  "eventType": "email.received",
  "data": {
    "messageId": "<264faaf4-6e12-4a73-9c2b-2da382008a07@mtasv.net>",
    "threadId": "pm_bounces@pm-bounces.cal.com",
    "subject": "30 Min Meeting between Danny Roosevelt and Akbar Shamji",
    "bodyHtml": "Your event has been scheduled<br>We sent an email to everyone with this information.<br><br>What:<br>30 Min Meeting …",
    "to": ["akbar@usebeya.com"],
    "from": "Danny Roosevelt <hello@cal.com>",
    "cc": []
  }
}

into

evb.put_events(
    Entries=[{
        "EventBusName": "beya-raw-events",        # ← the bus you created
        "Source":       "beya.platform",          # high-level source label
        "DetailType":   "email.received",         # lets you route/monitor
        "Time":         datetime.datetime.utcnow(),
        "Detail":       json.dumps(raw_event)     # ← your RawMessageEvent
    }]
)

into 

{
  "version": "0",
  "id": "8b9d1372-…",
  "detail-type": "email.received",
  "source": "beya.platform",
  "account": "575108947335",
  "time": "2025-07-12T14:22:08Z",
  "region": "us-east-1",
  "resources": [],
  "detail": {
    "eventId": "60413931-af2e-4b11-891e-3ab92c6f4ad2",
    "timestamp": "2025-07-12T14:22:08Z",
    "source": "platform",
    "orgId": "acme-org-uuid",
    "userId": "user-uuid-42",
    "eventType": "email.received",
    "data": { … }
  }
}

into 