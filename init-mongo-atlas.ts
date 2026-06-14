import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import {
  User,
  Chat,
  Message,
  Group,
  GroupMessage,
  GroupJoinRequest,
  FriendRequest,
  BlockedUser,
  CallSession,
  Report,
  AuditLog,
  AiMessage
} from './zalo_mongodb_schemas';

// Load environment variables from .env file
dotenv.config();

const models = [
  { name: 'User', model: User },
  { name: 'Chat', model: Chat },
  { name: 'Message', model: Message },
  { name: 'Group', model: Group },
  { name: 'GroupMessage', model: GroupMessage },
  { name: 'GroupJoinRequest', model: GroupJoinRequest },
  { name: 'FriendRequest', model: FriendRequest },
  { name: 'BlockedUser', model: BlockedUser },
  { name: 'CallSession', model: CallSession },
  { name: 'Report', model: Report },
  { name: 'AuditLog', model: AuditLog },
  { name: 'AiMessage', model: AiMessage }
];

async function main() {
  // Get URI from environment variable or command line argument
  let atlasUri = process.env.MONGODB_ATLAS_URI || process.argv[2];

  if (!atlasUri) {
    console.error('================================================================');
    console.error('❌ ERROR: Missing MongoDB Atlas Connection URI!');
    console.error('================================================================');
    console.error('Please configure your MONGODB_ATLAS_URI in a .env file:');
    console.error('  MONGODB_ATLAS_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/zalo_clone');
    console.error('\nOr pass it directly as a command-line argument:');
    console.error('  npm run db:init -- "mongodb+srv://<username>:<password>@cluster.mongodb.net/zalo_clone"');
    console.error('================================================================');
    process.exit(1);
  }

  // Hide password in console logs for security
  const maskedUri = atlasUri.replace(/:([^:@]+)@/, ':******@');
  console.log(`\n🔌 Connecting to MongoDB Atlas:\n   ${maskedUri}...\n`);

  try {
    // Connect to MongoDB
    await mongoose.connect(atlasUri);
    console.log('✅ Connected to MongoDB Atlas successfully!');
    console.log('----------------------------------------------------------------');
    console.log('🚀 Starting collection and index auto-creation...\n');

    // Create each collection and its indexes
    for (const item of models) {
      try {
        console.log(`🔹 Creating collection for model [${item.name}]...`);
        const collection = await item.model.createCollection();
        console.log(`   ✔️ Collection [${collection.collectionName}] is ready and indexes are built.`);
      } catch (err: any) {
        console.error(`   ❌ Failed to create collection/indexes for [${item.name}]:`, err.message);
      }
    }

    console.log('\n----------------------------------------------------------------');
    console.log('🎉 MongoDB Atlas initialization completed!');
    console.log('================================================================');

  } catch (error: any) {
    console.error('❌ Connection error to MongoDB Atlas:', error.message);
    process.exit(1);
  } finally {
    // Close connection
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.');
  }
}

main();
