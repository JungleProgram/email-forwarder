const AWS = require('aws-sdk');
const Airtable = require('airtable');
require('dotenv').config()

const forward_from = process.env.FROM_ADDRESS;
const domain = process.env.DOMAIN;

const waitFor = (ms) => new Promise(r => setTimeout(r, ms));

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

exports.test = async function() {
  exports.handler(null, null, true)
}

exports.handler = function(event, context) {
  
  // Airtable init
  const base = new Airtable({apiKey: process.env.AIRTABLE_KEY}).base(process.env.AIRTABLE_BASE);
  const table = base(process.env.AIRTABLE_TABLE);

  // Choose between test or production data
  if (event === null) {
    var message_info = require('./test_data.json')
  } else {
    var message_info = JSON.parse(event.Records[0].Sns.Message);
  }

  // Prepare an array with unique recipients
  var recipients = [message_info.receipt.recipients[0]];

  // Use our own asyncForEach
  asyncForEach(recipients, async (recipient) => {
    [recipient_username, recipient_domain] = recipient.split('@');

    // Filter by domain and lookup redirect email on Airtable
    if (recipient_domain != domain) {
      return;
    }

    // Airtable lookup
    table.select({
      maxRecords: 1,
      view: 'Grid view',
      filterByFormula: `AND({username} = "${recipient_username}", {active})`
    }).firstPage((err, records) => {
      if (records.length > 0) {
        exports.sendEmail(event, context, message_info, records[0].fields.email);
        console.log('-- Sending email to: ' + records[0].fields.email);
      }
    });
  })

}

exports.sendEmail = function(event, context, message_info, forward_to) {
  if (event === null) {
    console.log('-- TEST MODE -- Not sending an email to:' + forward_to);
  } else {
    // Don't process spam messages
    if (message_info.receipt.spamVerdict.status === 'FAIL' || message_info.receipt.virusVerdict.status === 'FAIL') {
      console.log('Message is spam or contains virus, ignoring.');
      context.succeed();
    }

    // Extract sender name
    var senderName = message_info.mail.commonHeaders.from[0].substring(0, message_info.mail.commonHeaders.from[0].indexOf(" <"));

    var email = message_info.content, headers = "From: "+senderName+" <"+forward_from+">\r\n";
    headers += "Reply-To: "+message_info.mail.commonHeaders.from[0]+"\r\n";
    headers += "X-Original-To: "+message_info.mail.commonHeaders.to[0]+"\r\n";
    headers += "To: "+forward_to+"\r\n";
    headers += "Subject: "+message_info.mail.commonHeaders.subject+"\r\n";

    if (email) {
      var res;
      res = email.match(/Content-Type:.+\s*boundary.*/);
      if (res) {
        headers += res[0]+"\r\n";
      }
      else {
        res = email.match(/^Content-Type:(.*)/m);
        if (res) {
          headers += res[0]+"\r\n";
        }
      }

      res = email.match(/^Content-Transfer-Encoding:(.*)/m);
      if (res) {
        headers += res[0]+"\r\n";
      }

      res = email.match(/^MIME-Version:(.*)/m);
      if (res) {
        headers += res[0]+"\r\n";
      }

      var splitEmail = email.split("\r\n\r\n");
      splitEmail.shift();

      email = headers+"\r\n"+splitEmail.join("\r\n\r\n");
    }
    else {
      email = headers+"\r\n"+"Empty email";
    }

    new AWS.SES().sendRawEmail({
      RawMessage: { Data: email }
    }, function(err, data) {
      if (err) context.fail(err);
      else {
        console.log('Sent with MessageId: ' + data.MessageId);
        context.succeed();
      }
    });
  }
}