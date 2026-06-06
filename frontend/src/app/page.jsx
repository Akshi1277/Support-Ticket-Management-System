'use client';

import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/tickets';

export default function Home() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' (Newest) or 'asc' (Oldest)

  // Stats State
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    progress: 0,
    resolved: 0,
    closed: 0,
  });

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [activeTicket, setActiveTicket] = useState(null); // Used for Edit & History
  const [ticketToDelete, setTicketToDelete] = useState(null);
  const [toasts, setToasts] = useState([]);
  
  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    customerName: '',
    priority: 'Medium',
    status: 'Open',
  });
  const [formError, setFormError] = useState('');

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Fetch Tickets
  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      setApiError('');
      
      const queryParams = new URLSearchParams();
      if (searchTerm) queryParams.append('search', searchTerm);
      if (statusFilter) queryParams.append('status', statusFilter);
      if (priorityFilter) queryParams.append('priority', priorityFilter);
      queryParams.append('sortBy', 'createdAt');
      queryParams.append('order', sortOrder);

      const res = await fetch(`${API_BASE}?${queryParams.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch tickets from the backend');
      }
      
      const data = await res.json();
      setTickets(data);
      calculateStats(data);
    } catch (err) {
      console.error(err);
      setApiError('Unable to connect to the backend server. Please verify the backend is running and MONGODB_URI is correctly configured.');
      showToast('Unable to connect to the backend server.', 'error');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, priorityFilter, sortOrder]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Calculate statistics from current filters/tickets
  const calculateStats = async (currentFiltered) => {
    try {
      const res = await fetch(`${API_BASE}`);
      if (res.ok) {
        const allTickets = await res.json();
        const counts = {
          total: allTickets.length,
          open: allTickets.filter(t => t.status === 'Open').length,
          progress: allTickets.filter(t => t.status === 'In Progress').length,
          resolved: allTickets.filter(t => t.status === 'Resolved').length,
          closed: allTickets.filter(t => t.status === 'Closed').length,
        };
        setStats(counts);
      }
    } catch (error) {
      const counts = {
        total: currentFiltered.length,
        open: currentFiltered.filter(t => t.status === 'Open').length,
        progress: currentFiltered.filter(t => t.status === 'In Progress').length,
        resolved: currentFiltered.filter(t => t.status === 'Resolved').length,
        closed: currentFiltered.filter(t => t.status === 'Closed').length,
      };
      setStats(counts);
    }
  };

  // Open Create/Edit modal
  const openModal = (ticket = null) => {
    setFormError('');
    if (ticket) {
      if (ticket.status === 'Closed') {
        showToast('Closed tickets cannot be edited.', 'error');
        return;
      }
      setActiveTicket(ticket);
      setFormData({
        title: ticket.title,
        description: ticket.description,
        customerName: ticket.customerName,
        priority: ticket.priority,
        status: ticket.status,
      });
    } else {
      setActiveTicket(null);
      setFormData({
        title: '',
        description: '',
        customerName: '',
        priority: 'Medium',
        status: 'Open',
      });
    }
    setModalOpen(true);
  };

  // Handle Form Input Change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.title.trim()) {
      showToast('Ticket Title is mandatory.', 'error');
      return;
    }
    if (!formData.description.trim()) {
      showToast('Ticket Description is mandatory.', 'error');
      return;
    }
    if (!formData.customerName.trim()) {
      showToast('Customer Name is mandatory.', 'error');
      return;
    }

    try {
      const url = activeTicket ? `${API_BASE}/${activeTicket._id}` : API_BASE;
      const method = activeTicket ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || 'Error saving ticket');
      }

      setModalOpen(false);
      showToast(activeTicket ? 'Ticket updated successfully.' : 'Ticket created successfully.', 'success');
      fetchTickets();
    } catch (err) {
      setFormError(err.message);
      showToast(err.message, 'error');
    }
  };

  // Handle Ticket Delete trigger
  const handleDeleteClick = (ticket) => {
    setTicketToDelete(ticket);
    setDeleteConfirmOpen(true);
  };

  // View Ticket History
  const viewHistory = (ticket) => {
    setActiveTicket(ticket);
    setHistoryModalOpen(true);
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-title-section">
          <h1>Support Ticket Hub</h1>
          <p>Streamline customer requests, updates, and workflows</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => openModal()}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Ticket
          </button>
        </div>
      </header>

      {/* API Connection Error Banner */}
      {apiError && (
        <div className="error-banner">
          <strong>Backend Offline:</strong> {apiError}
        </div>
      )}

      {/* Stats Section */}
      <section className="stats-grid">
        <div className="stat-card total">
          <div className="stat-label">Total Tickets</div>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat-card open">
          <div className="stat-label">Open</div>
          <div className="stat-value">{stats.open}</div>
        </div>
        <div className="stat-card progress">
          <div className="stat-label">In Progress</div>
          <div className="stat-value">{stats.progress}</div>
        </div>
        <div className="stat-card resolved">
          <div className="stat-label">Resolved</div>
          <div className="stat-value">{stats.resolved}</div>
        </div>
        <div className="stat-card closed">
          <div className="stat-label">Closed</div>
          <div className="stat-value">{stats.closed}</div>
        </div>
      </section>

      {/* Search & Filters */}
      <section className="filter-panel">
        <div className="input-group">
          <label className="input-label" htmlFor="search-input">Search Tickets</label>
          <input
            id="search-input"
            type="text"
            className="input-field"
            placeholder="Search by title or customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="input-group">
          <label className="input-label" htmlFor="status-filter">Status</label>
          <select
            id="status-filter"
            className="input-field"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
        <div className="input-group">
          <label className="input-label" htmlFor="priority-filter">Priority</label>
          <select
            id="priority-filter"
            className="input-field"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>
        <div className="input-group">
          <label className="input-label" htmlFor="sort-order">Sort By Date</label>
          <select
            id="sort-order"
            className="input-field"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>
        </div>
      </section>

      {/* Table & List View */}
      <section className="table-container">
        {loading ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                <circle cx="12" cy="12" r="10" strokeDasharray="32" />
              </svg>
            </div>
            <div className="empty-state-title">Loading Tickets...</div>
          </div>
        ) : tickets.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-12h9.75c1.05 0 2 .95 2 2v9c0 1.05-.95 2-2 2H7.5c-1.05 0-2-.95-2-2V8c0-1.05.95-2 2-2zM9 9h4.5M9 12h4.5M9 15h2.5" />
              </svg>
            </div>
            <div className="empty-state-title">No tickets found</div>
            <p className="empty-state-desc">No tickets found. Create your first support ticket.</p>
            <button className="btn btn-primary" onClick={() => openModal()}>
              Create Ticket
            </button>
          </div>
        ) : (
          <table className="tickets-table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Title</th>
                <th>Customer Name</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Created Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket._id}>
                  <td className="ticket-id">#{ticket._id.substring(ticket._id.length - 6).toUpperCase()}</td>
                  <td className="ticket-title-cell">{ticket.title}</td>
                  <td className="ticket-cust-cell">{ticket.customerName}</td>
                  <td>
                    <span className={`badge badge-priority-${ticket.priority.toLowerCase()}`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-status-${ticket.status.toLowerCase().replace(' ', '-')}`}>
                      {ticket.status}
                    </span>
                  </td>
                  <td>{new Date(ticket.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        className="btn-icon-only"
                        title="View History Logs"
                        onClick={() => viewHistory(ticket)}
                        aria-label="View history logs"
                      >
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                      <button
                        className="btn-icon-only"
                        title="Edit Details"
                        disabled={ticket.status === 'Closed'}
                        onClick={() => openModal(ticket)}
                        aria-label="Edit ticket"
                      >
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                      </button>
                      <button
                        className="btn-icon-only btn-danger"
                        title="Delete Ticket"
                        onClick={() => handleDeleteClick(ticket)}
                        aria-label="Delete ticket"
                      >
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Ticket Create/Edit Modal */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{activeTicket ? 'Edit Ticket' : 'Create New Ticket'}</h3>
              <button className="btn-icon-only" onClick={() => setModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {formError && <div className="error-banner">{formError}</div>}

                <div className="input-group">
                  <label className="input-label" htmlFor="form-title">Ticket Title *</label>
                  <input
                    id="form-title"
                    type="text"
                    name="title"
                    className="input-field"
                    placeholder="Brief summary of the issue"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label" htmlFor="form-cust">Customer Name *</label>
                  <input
                    id="form-cust"
                    type="text"
                    name="customerName"
                    className="input-field"
                    placeholder="Full name of the customer"
                    value={formData.customerName}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label" htmlFor="form-desc">Description *</label>
                  <textarea
                    id="form-desc"
                    name="description"
                    rows="4"
                    className="input-field"
                    placeholder="Detailed explanation of the support request..."
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                    style={{ resize: 'vertical' }}
                  ></textarea>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="input-group">
                    <label className="input-label" htmlFor="form-priority">Priority</label>
                    <select
                      id="form-priority"
                      name="priority"
                      className="input-field"
                      value={formData.priority}
                      onChange={handleInputChange}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label className="input-label" htmlFor="form-status">Status</label>
                    <select
                      id="form-status"
                      name="status"
                      className="input-field"
                      value={formData.status}
                      onChange={handleInputChange}
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {activeTicket ? 'Save Changes' : 'Create Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Log Modal */}
      {historyModalOpen && activeTicket && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Ticket Audit History</h3>
              <button className="btn-icon-only" onClick={() => setHistoryModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{activeTicket.title}</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Created by {activeTicket.customerName} | Ticket ID: {activeTicket._id}
                </p>
              </div>

              <div className="history-timeline">
                {activeTicket.history && activeTicket.history.length > 0 ? (
                  activeTicket.history.map((log) => (
                    <div key={log._id} className="history-item">
                      <div className="history-action">{log.action}</div>
                      {log.details && <div className="history-details">{log.details}</div>}
                      <div className="history-meta">
                        By {log.changedBy} on {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ color: 'var(--text-muted)' }}>No history details found.</p>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setHistoryModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && ticketToDelete && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Confirm Delete</h3>
              <button className="btn-icon-only" onClick={() => { setDeleteConfirmOpen(false); setTicketToDelete(null); }}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                Are you sure you want to permanently delete ticket <strong>"{ticketToDelete.title}"</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setDeleteConfirmOpen(false); setTicketToDelete(null); }}>
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={async () => {
                  const id = ticketToDelete._id;
                  setDeleteConfirmOpen(false);
                  setTicketToDelete(null);
                  try {
                    const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
                    if (!res.ok) throw new Error('Error deleting ticket');
                    showToast('Ticket deleted successfully.', 'success');
                    fetchTickets();
                  } catch (err) {
                    showToast(err.message, 'error');
                  }
                }}
              >
                Delete Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Container */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast-item toast-${t.type}`}>
            <div className="toast-content">{t.message}</div>
            <button className="toast-close" onClick={() => removeToast(t.id)}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}
