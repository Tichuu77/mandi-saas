import mongoose, {Schema,Document,Model} from "mongoose";
import  {SubscriptionPlanType, SubscriptionStatus, SubscriptionPaymentStatus} from "../types/enums";
import {SubscriptionPlan} from "../types/enums";

export interface Subscription extends Document{
    tenantId: string;
    plan:  string;
    planType:  string;
    amount: number;
    startDate: Date;
    endDate: Date;
    status:  string;
    autoRenew: boolean;
    gracePeriodDays: number;
    features: {
        maxUsers: number;
        storageGB: number;
        whatsAppEnabled: boolean;
        prioritySupport: boolean;
}
}
 const subscriptionSchema = new Schema<Subscription>({
    tenantId: { type: String, required: true },
    plan: { type: String, enum: Object.values(SubscriptionPlan), required: true },
    planType: { type: String, enum: Object.values(SubscriptionPlanType), required: true },
    amount: { type: Number, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: Object.values(SubscriptionStatus), required: true },
    autoRenew: { type: Boolean, required: true },
    gracePeriodDays: { type: Number, required: true },
    features: {
        maxUsers: { type: Number, required: true },
        storageGB: { type: Number, required: true },
        whatsAppEnabled: { type: Boolean, required: true },
        prioritySupport: { type: Boolean, required: true },
    },
});

export const SubscriptionModel: Model<Subscription> = mongoose.model<Subscription>("Subscription", subscriptionSchema);