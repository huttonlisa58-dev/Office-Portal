import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema(
  { name: String, type: String, url: String, publicId: String, uploadedAt: { type: Date, default: Date.now } },
  { _id: true }
);

const employeeSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    employeeId: { type: String, required: true }, // human-readable, e.g. ACME-0007
    firstName: { type: String, required: true },
    lastName: { type: String, default: '' },
    avatar: { url: String, publicId: String },

    // contact + personal
    email: { type: String, lowercase: true },
    phone: String,
    dob: Date,
    gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER', 'UNDISCLOSED'], default: 'UNDISCLOSED' },
    address: { line1: String, city: String, state: String, country: String, zip: String },
    emergencyContact: { name: String, relation: String, phone: String },

    // job
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    designation: { type: mongoose.Schema.Types.ObjectId, ref: 'Designation' },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    dateOfJoining: { type: Date, default: Date.now },
    employmentType: { type: String, enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'], default: 'FULL_TIME' },
    status: { type: String, enum: ['ACTIVE', 'ON_NOTICE', 'TERMINATED'], default: 'ACTIVE' },

    // face recognition: store embedding vector (computed client/edge side). See services/face.service.js
    faceEmbedding: { type: [Number], default: undefined, select: false },

    documents: [documentSchema],
  },
  { timestamps: true }
);

employeeSchema.index({ company: 1, employeeId: 1 }, { unique: true });
employeeSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`.trim();
});
employeeSchema.set('toJSON', { virtuals: true });

export default mongoose.model('Employee', employeeSchema);
