import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ArrowRight, X, Clock, Briefcase, DollarSign } from 'lucide-react';
import './CalendarPage.css';

interface CalendarEvent {
  id: string;
  projectId: string | number;
  projectTitle: string;
  type: 'start' | 'end' | 'payment' | 'payment-paid' | 'payment-overdue';
  status?: string;
  date: Date;
  amount?: string;
  description: string;
}

export const CalendarPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAndProcessEvents = async () => {
      try {
        const data = await apiClient.get('/documents/');
        const activeContracts = data;
        
        const extractedEvents: CalendarEvent[] = [];
        
        activeContracts.forEach((doc: any) => {
          // 1. Project Start
          const startDate = new Date(doc.created_at);
          extractedEvents.push({
            id: `start-${doc.id}`,
            projectId: doc.id,
            projectTitle: doc.title,
            type: 'start',
            date: startDate,
            description: 'Project officially starts.'
          });

          const metadata = doc.ai_metadata || {};
          
          // 2. Project End
          // Assume it might have endDate or we add 30 days if undefined for demo purposes
          const endDate = metadata.endDate ? new Date(metadata.endDate) : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
          extractedEvents.push({
            id: `end-${doc.id}`,
            projectId: doc.id,
            projectTitle: doc.title,
            type: 'end',
            date: endDate,
            description: 'Targeted project completion date.'
          });

          // 3. Invoices / Payments
          if (metadata.invoices && Array.isArray(metadata.invoices)) {
            metadata.invoices.forEach((inv: any, index: number) => {
              const paymentDate = inv.dueDate ? new Date(inv.dueDate) : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
              const isOverdue = inv.status === 'pending' && paymentDate < new Date();
              let eventType = 'payment'; // pending
              if (inv.status === 'paid') eventType = 'payment-paid';
              if (isOverdue) eventType = 'payment-overdue';
              
              extractedEvents.push({
                id: inv.id || `payment-${doc.id}-${index}`,
                projectId: doc.id,
                projectTitle: doc.title,
                type: eventType as any,
                date: paymentDate,
                amount: `${inv.amountNumber?.toLocaleString() || 0} ${inv.amountCurrency || ''}`,
                description: inv.description || `Payment Milestone ${index + 1}`,
                status: inv.status
              });
            });
          }
        });
        
        setEvents(extractedEvents);
      } catch (err) {
        console.error('Failed to load events', err);
      }
    };
    
    fetchAndProcessEvents();
  }, []);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();
    
    const days = [];
    // Previous month filler days
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    // Actual days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    // Next month filler days to complete grid (assume max 35 or 42 cells)
    const totalCells = days.length <= 35 ? 35 : 42;
    while (days.length < totalCells) {
      days.push(null);
    }
    
    return days;
  };

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const days = getDaysInMonth(currentDate);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(e => 
      e.date.getDate() === date.getDate() && 
      e.date.getMonth() === date.getMonth() && 
      e.date.getFullYear() === date.getFullYear()
    );
  };

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <h1>Project Timeline & Payments</h1>
        <div className="calendar-nav">
          <button className="calendar-nav-btn" onClick={handlePrevMonth}>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="calendar-month-title">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </div>
          <button className="calendar-nav-btn" onClick={handleNextMonth}>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="calendar-board">
        <div className="calendar-weekdays">
          {weekDays.map(day => (
            <div key={day} className="calendar-weekday">{day}</div>
          ))}
        </div>
        
        <div className="calendar-grid">
          {days.map((date, idx) => {
            if (!date) return <div key={idx} className="calendar-day empty"></div>;
            
            const dayEvents = getEventsForDate(date);
            const todayClass = isToday(date) ? 'today' : '';

            return (
              <div key={idx} className={`calendar-day ${todayClass}`}>
                <div className="calendar-day-header">
                  <span>{date.getDate()}</span>
                </div>
                <div className="calendar-events">
                  {dayEvents.map(event => (
                    <div 
                      key={event.id} 
                      className={`calendar-event event-${event.type}`}
                      onClick={() => setSelectedEvent(event)}
                    >
                      {event.type.startsWith('payment') ? <DollarSign className="w-3 h-3" /> : (event.type === 'start' ? <CalendarIcon className="w-3 h-3" /> : <Clock className="w-3 h-3" />)}
                      {event.type.startsWith('payment') ? event.amount : event.projectTitle}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Event Brief Popup Modal */}
      {selectedEvent && (
        <div className="event-modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="event-modal" onClick={e => e.stopPropagation()}>
            <div className="event-modal-header">
              <div>
                <div className={`event-modal-type type-${selectedEvent.type}`}>
                  {selectedEvent.type === 'start' && 'Project Start'}
                  {selectedEvent.type === 'end' && 'Project End'}
                  {selectedEvent.type === 'payment' && 'Payment Pending'}
                  {selectedEvent.type === 'payment-paid' && 'Payment Received'}
                  {selectedEvent.type === 'payment-overdue' && 'Payment Overdue'}
                </div>
                <h2>{selectedEvent.projectTitle}</h2>
              </div>
              <button className="event-modal-close" onClick={() => setSelectedEvent(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="event-modal-body">
              <div className="event-modal-detail">
                <div className="event-detail-row">
                  <div className="event-detail-icon"><CalendarIcon className="w-5 h-5" /></div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Date</div>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{selectedEvent.date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                  </div>
                </div>
                
                {selectedEvent.amount && (
                  <div className="event-detail-row">
                    <div className="event-detail-icon"><DollarSign className="w-5 h-5 text-emerald-600" /></div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>Payment Amount</div>
                      <div style={{ fontWeight: 700, color: '#166534' }}>{selectedEvent.amount}</div>
                    </div>
                  </div>
                )}

                <div className="event-detail-row">
                  <div className="event-detail-icon"><Briefcase className="w-5 h-5" /></div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Brief Description</div>
                    <div style={{ color: '#334155', lineHeight: 1.5 }}>{selectedEvent.description}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="event-modal-footer">
              <button className="btn-goto-contract" onClick={() => navigate(`/contract/${selectedEvent.projectId}`)}>
                View Contract <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
