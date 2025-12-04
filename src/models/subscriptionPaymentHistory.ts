import mongoose,{Model,Schema,Document} from "mongoose";
import {SubscriptionPaymentStatus} from "../types/enums";

export interface SubscriptionPaymentHistory extends Document {
    tenantId: mongoose.Types.ObjectId;
    subscriptionId: mongoose.Types.ObjectId;
    amount: number;
    paymentDate: Date;
    paymentMethod: string;
    transactionId: string;
    status: string;
}

const subscriptionPaymentHistorySchema = new Schema<SubscriptionPaymentHistory>({
    tenantId: { type: Schema.Types.ObjectId,ref:"Tenant", required: true },
    subscriptionId: { type: Schema.Types.ObjectId,ref:"Subscription", required: true },
    amount: { type: Number, required: true },
    paymentDate: { type: Date, required: true },
    paymentMethod: { type: String, required: true },
    transactionId: { type: String, required: true },
    status: { type: String, enum: Object.values(SubscriptionPaymentStatus), required: true },
});

export const SubscriptionPaymentHistoryModel: Model<SubscriptionPaymentHistory> = mongoose.model<SubscriptionPaymentHistory>("SubscriptionPaymentHistory", subscriptionPaymentHistorySchema);