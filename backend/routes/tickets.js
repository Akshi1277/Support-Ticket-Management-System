import express from 'express';
import Ticket from '../models/Ticket.js';

const router = express.Router();

// @desc    Get all tickets with searching, filtering, and sorting
// @route   GET /api/tickets
router.get('/', async (req, res) => {
  try {
    const { search, status, priority, sortBy = 'createdAt', order = 'desc' } = req.query;

    const query = {};

    // Search by Title or Customer Name
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by Status
    if (status) {
      query.status = status;
    }

    // Filter by Priority
    if (priority) {
      query.priority = priority;
    }

    const sortOrder = order === 'asc' ? 1 : -1;
    const tickets = await Ticket.find(query).sort({ [sortBy]: sortOrder });

    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get single ticket by ID
// @route   GET /api/tickets/:id
router.get('/:id', async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.id || req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Create a ticket
// @route   POST /api/tickets
router.post('/', async (req, res) => {
  try {
    const { title, description, customerName, priority, status } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Ticket Title is mandatory' });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ message: 'Ticket Description is mandatory' });
    }
    if (!customerName || !customerName.trim()) {
      return res.status(400).json({ message: 'Customer Name is mandatory' });
    }

    // Create and save new ticket (pre-save hook adds history)
    const ticket = new Ticket({
      title,
      description,
      customerName,
      priority,
      status
    });

    const savedTicket = await ticket.save();
    res.status(201).json(savedTicket);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @desc    Update a ticket
// @route   PUT /api/tickets/:id
router.put('/:id', async (req, res) => {
  try {
    const { title, description, customerName, priority, status } = req.body;

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Business Rule: Closed tickets cannot be edited
    if (ticket.status === 'Closed') {
      return res.status(400).json({ message: 'Closed tickets cannot be edited' });
    }

    // Build history entries for updates
    const changes = [];
    if (title && title !== ticket.title) {
      changes.push(`Title updated from "${ticket.title}" to "${title}"`);
      ticket.title = title;
    }
    if (description && description !== ticket.description) {
      changes.push('Description updated');
      ticket.description = description;
    }
    if (customerName && customerName !== ticket.customerName) {
      changes.push(`Customer Name updated from "${ticket.customerName}" to "${customerName}"`);
      ticket.customerName = customerName;
    }
    if (priority && priority !== ticket.priority) {
      changes.push(`Priority changed from ${ticket.priority} to ${priority}`);
      ticket.priority = priority;
    }
    if (status && status !== ticket.status) {
      changes.push(`Status changed from ${ticket.status} to ${status}`);
      ticket.status = status;
    }

    if (changes.length > 0) {
      ticket.history.push({
        action: 'Ticket Updated',
        details: changes.join(', ')
      });
      const updatedTicket = await ticket.save();
      res.json(updatedTicket);
    } else {
      res.json(ticket);
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @desc    Delete a ticket
// @route   DELETE /api/tickets/:id
router.delete('/:id', async (req, res) => {
  try {
    const ticket = await Ticket.findByIdAndDelete(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    res.json({ message: 'Ticket deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
