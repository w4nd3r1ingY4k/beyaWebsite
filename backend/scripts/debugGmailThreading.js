import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({
    region: "us-east-1",
});
const docClient = DynamoDBDocumentClient.from(client);

async function debugRecentMessages() {
    console.log("=== DEBUGGING GMAIL THREAD ID THREADING ===\n");
    
    // Get recent messages

    try {
        // Query recent messages by timestamp
        const scanParams = {
            TableName: "Messages",
            ProjectionExpression: "MessageId, ThreadId, Subject, Direction, #ts, #from, #to, Headers",
            ExpressionAttributeNames: {
                "#ts": "Timestamp",
                "#from": "From", 
                "#to": "To"
            },
            Limit: 50
        };
        
        const result = await docClient.send(new ScanCommand(scanParams));
        const messages = result.Items.sort((a, b) => b.Timestamp - a.Timestamp);
        
        console.log("Recent Messages:");
        console.log("================");
        
        messages.forEach((msg, i) => {
            console.log(`${i + 1}. MessageId: ${msg.MessageId}`);
            console.log(`   ThreadId: ${msg.ThreadId}`);
            console.log(`   Subject: ${msg.Subject}`);
            console.log(`   Direction: ${msg.Direction}`);
            console.log(`   From: ${msg.From}`);
            console.log(`   To: ${JSON.stringify(msg.To)}`);
            console.log(`   Timestamp: ${new Date(msg.Timestamp).toISOString()}`);
            
            if (msg.Headers) {
                console.log(`   Headers:`);
                console.log(`     Message-ID: ${msg.Headers['Message-ID']}`);
                console.log(`     Gmail-Thread-ID: ${msg.Headers['Gmail-Thread-ID']}`);
                console.log(`     In-Reply-To: ${msg.Headers['In-Reply-To']}`);
                console.log(`     References: ${msg.Headers['References']}`);
            }
            console.log('   ---');
        });

        // Look for potential threading pairs
        console.log("\n=== THREADING ANALYSIS ===");
        
        // Find Andiamo messages
        const andiamo = messages.filter(m => 
            m.Subject && (m.Subject.includes('Andiamo') || m.Subject.includes('andiamo'))
        );
        
        if (andiamo.length > 0) {
            console.log("\nAndiamo messages found:");
            andiamo.forEach(msg => {
                console.log(`- ${msg.Subject} (${msg.Direction}) - ThreadId: ${msg.ThreadId}`);
                if (msg.Headers) {
                    console.log(`  Gmail-Thread-ID: ${msg.Headers['Gmail-Thread-ID']}`);
                    console.log(`  Message-ID: ${msg.Headers['Message-ID']}`);
                    console.log(`  In-Reply-To: ${msg.Headers['In-Reply-To']}`);
                }
            });
        }

        // Find "man" messages
        const man = messages.filter(m => 
            m.Subject === 'man'
        );
        
        if (man.length > 0) {
            console.log("\n'man' messages found:");
            man.forEach(msg => {
                console.log(`- ${msg.Subject} (${msg.Direction}) - ThreadId: ${msg.ThreadId}`);
                if (msg.Headers) {
                    console.log(`  Gmail-Thread-ID: ${msg.Headers['Gmail-Thread-ID']}`);
                    console.log(`  Message-ID: ${msg.Headers['Message-ID']}`);
                    console.log(`  In-Reply-To: ${msg.Headers['In-Reply-To']}`);
                }
            });
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

debugRecentMessages(); 