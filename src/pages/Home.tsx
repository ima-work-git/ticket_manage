import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useTickets, type TicketWithDetails } from '../hooks/useTickets';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

const statusLabels: Record<string, string> = {
  active: '有効',
  used: '使用済み',
  expired: '期限切れ',
  refunded: '返却済み',
};

function TicketCard({
  ticket,
  onClick,
}: {
  ticket: TicketWithDetails;
  onClick: () => void;
}) {
  return (
    <div className="ticket-card" onClick={onClick} style={{ cursor: 'pointer' }}>
      {ticket.template?.image ? (
        <img
          src={ticket.template.image}
          alt={ticket.template?.name}
          className="ticket-image"
        />
      ) : (
        <div className="ticket-image-placeholder">
          {ticket.template?.name?.[0] || '?'}
        </div>
      )}
      <div className="ticket-content">
        <div className="ticket-name">{ticket.template?.name || '不明なチケット'}</div>
        <div className="ticket-group">{ticket.group?.name || '不明なグループ'}</div>
        <div className="flex items-center justify-between">
          <span className={`ticket-status ${ticket.status}`}>
            {statusLabels[ticket.status]}
          </span>
          {ticket.expiresAt && ticket.status === 'active' && (
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {format(new Date(ticket.expiresAt), 'yyyy/MM/dd まで', {
                locale: ja,
              })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function Home() {
  const navigate = useNavigate();
  const { activeTickets, usedTickets, loading } = useTickets();
  const [tab, setTab] = useState<'active' | 'used'>('active');

  const displayTickets = tab === 'active' ? activeTickets : usedTickets;

  // Group tickets by group
  const groupedTickets = displayTickets.reduce(
    (acc, ticket) => {
      const groupName = ticket.group?.name || '不明なグループ';
      if (!acc[groupName]) {
        acc[groupName] = [];
      }
      acc[groupName].push(ticket);
      return acc;
    },
    {} as Record<string, TicketWithDetails[]>
  );

  if (loading) {
    return (
      <Layout title="マイチケット">
        <div className="loading">
          <div className="spinner" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="マイチケット">
      <div className="container">
        <div className="tabs">
          <button
            className={`tab ${tab === 'active' ? 'active' : ''}`}
            onClick={() => setTab('active')}
          >
            有効 ({activeTickets.length})
          </button>
          <button
            className={`tab ${tab === 'used' ? 'active' : ''}`}
            onClick={() => setTab('used')}
          >
            使用済み ({usedTickets.length})
          </button>
        </div>

        {displayTickets.length === 0 ? (
          <div className="empty-state">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M3 10h18" />
            </svg>
            <p>
              {tab === 'active'
                ? '有効なチケットがありません'
                : '使用済みのチケットがありません'}
            </p>
            <p style={{ fontSize: 14, marginTop: 8 }}>
              運営のQRコードをスキャンしてチケットを受け取りましょう
            </p>
          </div>
        ) : (
          Object.entries(groupedTickets).map(([groupName, tickets]) => (
            <div key={groupName} className="section">
              <h2 className="section-title">{groupName}</h2>
              {tickets.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  onClick={() => navigate(`/ticket/${ticket.id}`)}
                />
              ))}
            </div>
          ))
        )}
      </div>
    </Layout>
  );
}
