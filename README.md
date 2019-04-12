# email-forwarder

Email Forwarder forwards emails received from [AWS SES](https://aws.amazon.com/ses/details/) to the matching email address on [Airtable](https://airtable.com). 

Email Forwarder is written in Node.js running on [AWS Lambda](https://aws.amazon.com/lambda/details/).

### Amazon SES

Amazon Simple Email Service (Amazon SES) is a cloud-based email sending service designed to help digital marketers and application developers send marketing, notification, and transactional emails.

It also provides capabilities to receive emails and programmatically process them or store them for archival.

### Airtable

[Airtable](https://airtable.com/product) is a SaaS product, offering a spreadsheet-database hybrid where the features of a database are applied to a spreadsheet. In a sense, it's more powerful compared to Google Sheets. Airtable offers [API](https://airtable.com/api) and [libraries](https://github.com/Airtable/airtable.js) to access and edit the spreadsheets programmatically.

### Export to AWS Lambda

```
npm run export
```

### Credits and inspiration

[Forwarding Emails to your Inbox Using Amazon SES](https://medium.com/@ashan.fernando/forwarding-emails-to-your-inbox-using-amazon-ses-2d261d60e417)

[Quail](https://github.com/donny/quail)
