import mongoose, { Schema, Document, Model }  from 'mongoose';
import { TenantStatus } from '@/types/enums';

interface Itenant extends Document{
    _id:mongoose.Types.ObjectId,
    name :string,
    status:string,
    subscriptionId:mongoose.Types.ObjectId,
}

const tenantSchema = new Schema<Itenant>({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
    },
    status: {
        type: String,
        enum:Object.values(TenantStatus),
        default: 'active',
    },
    subscriptionId: {
        type: Schema.Types.ObjectId,
        ref: 'Subscription',
        default: null,
    },
})

const Tenant: Model<Itenant> = mongoose.model<Itenant>("Tenant", tenantSchema);

export default Tenant