import mongoose from 'mongoose';

const HistorySchema = new mongoose.Schema({
  action: {
    type: String,
    required: true
  },
  changedBy: {
    type: String,
    default: 'Agent'
  },
  details: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const TicketSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Ticket Title is mandatory'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Ticket Description is mandatory'],
      trim: true
    },
    customerName: {
      type: String,
      required: [true, 'Customer Name is mandatory'],
      trim: true
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Medium',
      required: true
    },
    status: {
      type: String,
      enum: ['Open', 'In Progress', 'Resolved', 'Closed'],
      default: 'Open',
      required: true
    },
    history: [HistorySchema]
  },
  {
    timestamps: true
  }
);

TicketSchema.pre('save', function (next) {
  if (this.isNew) {
    this.history.push({
      action: 'Ticket Created',
      details: `Created by ${this.customerName} with Priority: ${this.priority} and Status: ${this.status}`
    });
  }
  next();
});

const Ticket = mongoose.model('Ticket', TicketSchema);
export default Ticket;
