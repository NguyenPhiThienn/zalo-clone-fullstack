import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * ============================================================================
 * ZALO CLONE - DATABASE SCHEMAS FOR MONGODB ATLAS
 * File: zalo_mongodb_schemas.ts
 * ============================================================================
 * 
 * Tài liệu này chứa toàn bộ các TypeScript Interface và Mongoose Schema tương ứng
 * với hệ thống cơ sở dữ liệu MySQL của dự án Zalo Clone.
 * 
 * ĐĂC ĐIỂM THIẾT KẾ MONGODB:
 * 1. Sử dụng Mongoose (thư viện ODM phổ biến nhất cho Node.js & MongoDB).
 * 2. Nhúng (Embedding) các bảng phụ vào bảng chính nếu dữ liệu nhỏ và truy vấn cùng nhau:
 *    - Bảng reaction (message_reaction/group_message_reaction) được nhúng trực tiếp vào messages/group_messages.
 *    - Thành viên nhóm (group_member) được nhúng trực tiếp vào groups.
 *    - Pinned Message được nhúng trực tiếp vào groups.
 * 3. Tách biệt tin nhắn (messages/group_messages) ra khỏi phòng chat/nhóm để tránh giới hạn 16MB document của MongoDB.
 * 4. Định nghĩa đầy đủ các Index (Single, Compound, Unique) để tối ưu hóa hiệu năng truy vấn.
 */

// ============================================================================
// 1. USER MODEL
// ============================================================================

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  avatarUrl?: string;
  lastSeen?: Date;
  keycloakId?: string;
  isOnline: boolean;
  role: 'USER' | 'ADMIN';
  banned: boolean;
  banReason?: string;
  banUntil?: Date;
  bannedAt?: Date;
  emailVerified: boolean;
  verificationCode?: string;
  verificationCodeExpiry?: Date;
  resetPasswordCode?: string;
  resetPasswordCodeExpiry?: Date;
  tokenVersion: number;
  createdDate: Date;
  lastModifiedDate?: Date;
}

const UserSchema = new Schema<IUser>({
  firstName: { type: String, required: true, trim: true, maxlength: 100 },
  lastName: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
  password: { type: String },
  avatarUrl: { type: String, max: 500 },
  lastSeen: { type: Date },
  keycloakId: { type: String, unique: true, sparse: true, index: true },
  isOnline: { type: Boolean, default: false },
  role: { type: String, enum: ['USER', 'ADMIN'], default: 'USER' },
  banned: { type: Boolean, default: false },
  banReason: { type: String, maxlength: 500 },
  banUntil: { type: Date },
  bannedAt: { type: Date },
  emailVerified: { type: Boolean, default: false },
  verificationCode: { type: String, maxlength: 6 },
  verificationCodeExpiry: { type: Date },
  resetPasswordCode: { type: String, maxlength: 6 },
  resetPasswordCodeExpiry: { type: Date },
  tokenVersion: { type: Number, default: 1 },
  createdDate: { type: Date, default: Date.now },
  lastModifiedDate: { type: Date }
}, {
  timestamps: { createdAt: 'createdDate', updatedAt: 'lastModifiedDate' }
});

export const User = mongoose.model<IUser>('User', UserSchema);


// ============================================================================
// 2. CHAT MODEL (1-1 Conversation Metadata)
// ============================================================================

export interface IChatDeletedBy {
  userId: Types.ObjectId;
  deletedAt: Date;
}

export interface IChat extends Document {
  participants: Types.ObjectId[]; // Phải luôn chứa đúng 2 User ID
  deletedByUser1: boolean;
  deletedByUser2: boolean;
  deletedAtByUser1?: Date;
  deletedAtByUser2?: Date;
  createdDate: Date;
  lastModifiedDate?: Date;
}

const ChatSchema = new Schema<IChat>({
  participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
  deletedByUser1: { type: Boolean, default: false },
  deletedByUser2: { type: Boolean, default: false },
  deletedAtByUser1: { type: Date },
  deletedAtByUser2: { type: Date },
  createdDate: { type: Date, default: Date.now },
  lastModifiedDate: { type: Date }
}, {
  timestamps: { createdAt: 'createdDate', updatedAt: 'lastModifiedDate' }
});

// Index để tìm nhanh phòng chat dựa trên participants (cặp 2 người dùng)
ChatSchema.index({ participants: 1 });
// Compound index tối ưu tìm kiếm chat cụ thể giữa user A và user B
ChatSchema.index({ 'participants.0': 1, 'participants.1': 1 });

export const Chat = mongoose.model<IChat>('Chat', ChatSchema);


// ============================================================================
// 3. MESSAGE MODEL (1-1 Chat Messages)
// ============================================================================

export interface IReaction {
  userId: Types.ObjectId;
  emoji: string;
  createdDate: Date;
}

export interface IMessage extends Document {
  chatId: Types.ObjectId;
  senderId: Types.ObjectId;
  content?: string;
  state: 'SENT' | 'DELIVERED' | 'RECEIVED' | 'SEEN';
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE';
  fileName?: string;
  deleted: boolean; // Dùng để thu hồi tin nhắn (unsend)
  deletedBySender: boolean; // Xóa ở phía tôi (sender)
  deletedByReceiver: boolean; // Xóa ở phía tôi (receiver)
  reactions: IReaction[]; // Embedded Array
  createdDate: Date;
  lastModifiedDate?: Date;
}

const MessageSchema = new Schema<IMessage>({
  chatId: { type: Schema.Types.ObjectId, ref: 'Chat', required: true, index: true },
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  content: { type: String },
  state: { type: String, enum: ['SENT', 'DELIVERED', 'RECEIVED', 'SEEN'], default: 'SENT', index: true },
  type: { type: String, enum: ['TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'FILE'], default: 'TEXT' },
  fileName: { type: String },
  deleted: { type: Boolean, default: false },
  deletedBySender: { type: Boolean, default: false },
  deletedByReceiver: { type: Boolean, default: false },
  reactions: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    emoji: { type: String, required: true },
    createdDate: { type: Date, default: Date.now }
  }],
  createdDate: { type: Date, default: Date.now },
  lastModifiedDate: { type: Date }
}, {
  timestamps: { createdAt: 'createdDate', updatedAt: 'lastModifiedDate' }
});

// Compound Index tối ưu cho việc lấy lịch sử tin nhắn của một phòng chat sắp xếp theo thời gian
MessageSchema.index({ chatId: 1, createdDate: -1 });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);


// ============================================================================
// 4. GROUP MODEL (Group Chat Metadata with members embedded)
// ============================================================================

export interface IGroupMember {
  userId: Types.ObjectId;
  admin: boolean;
  joinedAt: Date;
  createdByUser?: string;
  lastModifiedByUser?: string;
}

export interface IPinnedGroupMessage {
  messageId: Types.ObjectId;
  pinnedBy: Types.ObjectId;
  pinnedAt: Date;
}

export interface IGroup extends Document {
  name: string;
  description?: string;
  avatarUrl?: string;
  createdBy: Types.ObjectId;
  members: IGroupMember[]; // Embedded Array (Tối ưu hóa join trong MongoDB)
  pinnedMessages: IPinnedGroupMessage[]; // Embedded Array thay vì bảng riêng
  createdByUser?: string;
  lastModifiedByUser?: string;
  createdDate: Date;
  lastModifiedDate?: Date;
}

const GroupSchema = new Schema<IGroup>({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String },
  avatarUrl: { type: String, max: 500 },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  members: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    admin: { type: Boolean, default: false },
    joinedAt: { type: Date, default: Date.now },
    createdByUser: { type: String },
    lastModifiedByUser: { type: String }
  }],
  pinnedMessages: [{
    messageId: { type: Schema.Types.ObjectId, required: true }, // Ref tới GroupMessage
    pinnedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    pinnedAt: { type: Date, default: Date.now }
  }],
  createdByUser: { type: String },
  lastModifiedByUser: { type: String },
  createdDate: { type: Date, default: Date.now },
  lastModifiedDate: { type: Date }
}, {
  timestamps: { createdAt: 'createdDate', updatedAt: 'lastModifiedDate' }
});

// Tạo index trên userId của các thành viên để tìm nhanh danh sách nhóm của 1 user
GroupSchema.index({ 'members.userId': 1 });

export const Group = mongoose.model<IGroup>('Group', GroupSchema);


// ============================================================================
// 5. GROUP MESSAGE MODEL (Group Chat Messages)
// ============================================================================

export interface IGroupMessage extends Document {
  groupId: Types.ObjectId;
  senderId: Types.ObjectId;
  content?: string;
  type: string; // TEXT, IMAGE, VIDEO, FILE,...
  fileName?: string;
  deleted: boolean; // Thu hồi tin nhắn
  reactions: IReaction[]; // Embedded Array reactions
  hiddenFrom: Types.ObjectId[]; // Array User ID ẩn tin nhắn này ở phía họ (thay thế group_message_hidden)
  createdByUser?: string;
  lastModifiedByUser?: string;
  createdDate: Date;
  lastModifiedDate?: Date;
}

const GroupMessageSchema = new Schema<IGroupMessage>({
  groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  content: { type: String },
  type: { type: String, default: 'TEXT' },
  fileName: { type: String },
  deleted: { type: Boolean, default: false },
  reactions: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    emoji: { type: String, required: true },
    createdDate: { type: Date, default: Date.now }
  }],
  hiddenFrom: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  createdByUser: { type: String },
  lastModifiedByUser: { type: String },
  createdDate: { type: Date, default: Date.now, index: true },
  lastModifiedDate: { type: Date }
}, {
  timestamps: { createdAt: 'createdDate', updatedAt: 'lastModifiedDate' }
});

// Compound Index tối ưu lấy tin nhắn nhóm theo thời gian
GroupMessageSchema.index({ groupId: 1, createdDate: -1 });

export const GroupMessage = mongoose.model<IGroupMessage>('GroupMessage', GroupMessageSchema);


// ============================================================================
// 6. GROUP JOIN REQUEST MODEL
// ============================================================================

export interface IGroupJoinRequest extends Document {
  groupId: Types.ObjectId;
  requestedById: Types.ObjectId;
  targetUserId: Types.ObjectId;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdDate: Date;
  lastModifiedDate?: Date;
}

const GroupJoinRequestSchema = new Schema<IGroupJoinRequest>({
  groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
  requestedById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  targetUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['PENDING', 'ACCEPTED', 'REJECTED'], default: 'PENDING', index: true },
  createdDate: { type: Date, default: Date.now },
  lastModifiedDate: { type: Date }
}, {
  timestamps: { createdAt: 'createdDate', updatedAt: 'lastModifiedDate' }
});

export const GroupJoinRequest = mongoose.model<IGroupJoinRequest>('GroupJoinRequest', GroupJoinRequestSchema);


// ============================================================================
// 7. FRIEND REQUEST MODEL
// ============================================================================

export interface IFriendRequest extends Document {
  senderId: Types.ObjectId;
  receiverId: Types.ObjectId;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdDate: Date;
  lastModifiedDate?: Date;
}

const FriendRequestSchema = new Schema<IFriendRequest>({
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['PENDING', 'ACCEPTED', 'REJECTED'], default: 'PENDING', index: true },
  createdDate: { type: Date, default: Date.now },
  lastModifiedDate: { type: Date }
}, {
  timestamps: { createdAt: 'createdDate', updatedAt: 'lastModifiedDate' }
});

// Chỉ cho phép tồn tại tối đa một yêu cầu kết bạn giữa A và B
FriendRequestSchema.index({ senderId: 1, receiverId: 1 }, { unique: true });
FriendRequestSchema.index({ receiverId: 1, status: 1 }); // Tìm nhanh các yêu cầu kết bạn đang chờ xử lý của một User

export const FriendRequest = mongoose.model<IFriendRequest>('FriendRequest', FriendRequestSchema);


// ============================================================================
// 8. BLOCKED USER MODEL
// ============================================================================

export interface IBlockedUser extends Document {
  blockerId: Types.ObjectId;
  blockedId: Types.ObjectId;
  createdDate: Date;
}

const BlockedUserSchema = new Schema<IBlockedUser>({
  blockerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  blockedId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdDate: { type: Date, default: Date.now }
}, {
  timestamps: { createdAt: 'createdDate', updatedAt: false }
});

// Compound unique index để tránh việc chặn trùng lặp
BlockedUserSchema.index({ blockerId: 1, blockedId: 1 }, { unique: true });

export const BlockedUser = mongoose.model<IBlockedUser>('BlockedUser', BlockedUserSchema);


// ============================================================================
// 9. CALL SESSION MODEL (Voice & Video Call History)
// ============================================================================

export interface ICallSession extends Document {
  chatId: Types.ObjectId;
  initiatorId: Types.ObjectId;
  receiverId: Types.ObjectId;
  callType: 'VOICE' | 'VIDEO';
  status: 'MISSED' | 'ENDED' | 'REJECTED';
  durationSec?: number;
  startedAt: Date;
  endedAt?: Date;
  createdDate: Date;
  lastModifiedDate?: Date;
}

const CallSessionSchema = new Schema<ICallSession>({
  chatId: { type: Schema.Types.ObjectId, ref: 'Chat', required: true, index: true },
  initiatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  receiverId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  callType: { type: String, enum: ['VOICE', 'VIDEO'], required: true },
  status: { type: String, enum: ['MISSED', 'ENDED', 'REJECTED'], required: true },
  durationSec: { type: Number },
  startedAt: { type: Date, default: Date.now, index: true },
  endedAt: { type: Date },
  createdDate: { type: Date, default: Date.now },
  lastModifiedDate: { type: Date }
}, {
  timestamps: { createdAt: 'createdDate', updatedAt: 'lastModifiedDate' }
});

export const CallSession = mongoose.model<ICallSession>('CallSession', CallSessionSchema);


// ============================================================================
// 10. REPORT MODEL (Report and Violations)
// ============================================================================

export interface IReport extends Document {
  reporterId: Types.ObjectId;
  reportedId: Types.ObjectId;
  reason: string;
  description?: string;
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
  evidenceKeys?: string[]; // S3 / Cloudflare R2 files keys stored as array of strings
  resolvedAt?: Date;
  resolvedBy?: Types.ObjectId;
  resolution?: string;
  createdDate: Date;
  lastModifiedDate?: Date;
}

const ReportSchema = new Schema<IReport>({
  reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  reportedId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  reason: { type: String, required: true, maxlength: 100 },
  description: { type: String, maxlength: 1000 },
  status: { type: String, enum: ['PENDING', 'RESOLVED', 'DISMISSED'], default: 'PENDING', index: true },
  evidenceKeys: [{ type: String }],
  resolvedAt: { type: Date },
  resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  resolution: { type: String, maxlength: 500 },
  createdDate: { type: Date, default: Date.now },
  lastModifiedDate: { type: Date }
}, {
  timestamps: { createdAt: 'createdDate', updatedAt: 'lastModifiedDate' }
});

export const Report = mongoose.model<IReport>('Report', ReportSchema);


// ============================================================================
// 11. AUDIT LOG MODEL (Admin actions)
// ============================================================================

export interface IAuditLog extends Document {
  adminId: Types.ObjectId;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId?: string;
  targetName?: string;
  details?: string;
  createdDate: Date;
  lastModifiedDate?: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
  adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  adminEmail: { type: String, required: true },
  action: { type: String, required: true, maxlength: 50 },
  targetType: { type: String, required: true, maxlength: 20 },
  targetId: { type: String },
  targetName: { type: String },
  details: { type: String },
  createdDate: { type: Date, default: Date.now },
  lastModifiedDate: { type: Date }
}, {
  timestamps: { createdAt: 'createdDate', updatedAt: 'lastModifiedDate' }
});

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);


// ============================================================================
// 12. AI MESSAGE MODEL (Conversations with AI Bot)
// ============================================================================

export interface IAiMessage extends Document {
  userId: Types.ObjectId;
  role: 'user' | 'assistant';
  content: string;
  createdDate: Date;
  lastModifiedDate?: Date;
}

const AiMessageSchema = new Schema<IAiMessage>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  createdDate: { type: Date, default: Date.now, index: true },
  lastModifiedDate: { type: Date }
}, {
  timestamps: { createdAt: 'createdDate', updatedAt: 'lastModifiedDate' }
});

export const AiMessage = mongoose.model<IAiMessage>('AiMessage', AiMessageSchema);


/**
 * ============================================================================
 * CHỈ DẪN KẾT NỐI VÀ KHỞI TẠO ĐẾN MONGODB ATLAS:
 * ============================================================================
 * 
 * 1. Cài đặt các gói phụ thuộc (Dependencies):
 *    npm install mongoose
 *    npm install -D typescript @types/node @types/mongoose (nếu dùng TypeScript)
 * 
 * 2. Kết nối đến Database (MongoDB Atlas Connection):
 *    
 *    import mongoose from 'mongoose';
 * 
 *    const ATLAS_URI = "mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/zalo_clone?retryWrites=true&w=majority";
 * 
 *    async function connectDB() {
 *      try {
 *        await mongoose.connect(ATLAS_URI);
 *        console.log("Kết nối MongoDB Atlas thành công!");
 *      } catch (error) {
 *        console.error("Lỗi kết nối cơ sở dữ liệu:", error);
 *        process.exit(1);
 *      }
 *    }
 * 
 * 3. Tạo dữ liệu mẫu và quan hệ:
 *    
 *    // Ví dụ tạo mới một User
 *    const newUser = await User.create({
 *      firstName: "Nguyễn",
 *      lastName: "Văn A",
 *      email: "vana@gmail.com",
 *      isOnline: true,
 *      role: "USER",
 *      emailVerified: true
 *    });
 * 
 *    // Ví dụ tạo phòng Chat 1-1 giữa 2 user
 *    const newChat = await Chat.create({
 *      participants: [newUser._id, anotherUserId]
 *    });
 * 
 *    // Ví dụ tạo tin nhắn và thêm reaction nhúng (Embedded)
 *    const newMessage = await Message.create({
 *      chatId: newChat._id,
 *      senderId: newUser._id,
 *      content: "Xin chào! Bạn khỏe không?",
 *      type: "TEXT",
 *      state: "SENT",
 *      reactions: [
 *        { userId: newUser._id, emoji: "❤️" }
 *      ]
 *    });
 */
