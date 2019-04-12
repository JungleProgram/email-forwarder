const AWS = require('aws-sdk');
const Airtable = require('airtable');
require('dotenv').config()

var forwardFrom = process.env.FROM_ADDRESS;
var forwardTo = process.env.TO_ADDRESS;

exports.handler = function(event, context) {
    
    // Airtable init
    var base = new Airtable({apiKey: process.env.AIRTABLE_KEY}).base(process.env.AIRTABLE_BASE);
    var table = base(process.env.AIRTABLE_TABLE);

    // Extract the first member of the email address
    var msgInfo = JSON.parse(event.Records[0].Sns.Message);
    var originalEmail = msgInfo.mail.commonHeaders.to[0];
    username = originalEmail.substring(0, originalEmail.indexOf("@"));

    // Look for the member with its username
    table.select({
        maxRecords: 1,
        view: 'Grid view',
        filterByFormula: `AND({username} = "${username}", {active})`
    }).firstPage((err, records) => {
        if (err) {
            console.error(err);
            return;
        }
        
        // If user is found, redirect the message to its address
        if (records.length > 0) {
            forwardTo = records[0].fields.email;
        }

        // don't process spam messages
        if (msgInfo.receipt.spamVerdict.status === 'FAIL' || msgInfo.receipt.virusVerdict.status === 'FAIL') {
            console.log('Message is spam or contains virus, ignoring.');
            context.succeed();
        }

        // Extract sender name
        var senderName = msgInfo.mail.commonHeaders.from[0].substring(0, msgInfo.mail.commonHeaders.from[0].indexOf(" <"));

        var email = msgInfo.content, headers = "From: "+senderName+" <"+forwardFrom+">\r\n";
        headers += "Reply-To: "+msgInfo.mail.commonHeaders.from[0]+"\r\n";
        headers += "X-Original-To: "+msgInfo.mail.commonHeaders.to[0]+"\r\n";
        headers += "To: "+forwardTo+"\r\n";
        headers += "Subject: "+msgInfo.mail.commonHeaders.subject+"\r\n";

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

    });

}
