const TicketCard = ({ ticket, onValidate, onRevoke, isOwner, userAddress }) => {
    const isExpired = new Date(ticket.expiration) < new Date();
    const isOwned = ticket.owner?.toLowerCase() === userAddress?.toLowerCase();

    const getStatusColor = () => {
        if (ticket.used) return '#dc3545'; // Red
        if (isExpired) return '#ffc107'; // Yellow
        return '#28a745'; // Green
    };

    const getStatusText = () => {
        if (ticket.used) return 'USED';
        if (isExpired) return 'EXPIRED';
        return 'ACTIVE';
    };

    const formatPrice = (wei) => {
        try {
            return ethers.utils.formatEther(wei || '0');
        } catch {
            return '0';
        }
    };

    return (
        <div style={{
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '15px',
            marginBottom: '10px',
            backgroundColor: '#fff',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>🎫 Ticket #{ticket.id}</h4>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '14px' }}>
                        <div><strong>Owner:</strong> {ticket.owner ? `${ticket.owner.slice(0, 6)}...${ticket.owner.slice(-4)}` : 'Unknown'}</div>
                        <div><strong>Price Cap:</strong> {formatPrice(ticket.resalePriceCap)} ETH</div>
                        <div><strong>Expiration:</strong> {new Date(ticket.expiration).toLocaleDateString()}</div>
                        <div><strong>Status:</strong>
                            <span style={{
                                color: getStatusColor(),
                                fontWeight: 'bold',
                                marginLeft: '5px'
                            }}>
                                {getStatusText()}
                            </span>
                        </div>
                    </div>

                    {ticket.metadataURI && (
                        <div style={{ marginTop: '10px' }}>
                            <strong>Metadata:</strong>
                            <a href={ticket.metadataURI} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '5px', color: '#007bff' }}>
                                View Details
                            </a>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginLeft: '15px' }}>
                    {!ticket.used && !isExpired && (
                        <button
                            onClick={() => onValidate(ticket.id)}
                            style={{
                                backgroundColor: '#28a745',
                                color: 'white',
                                border: 'none',
                                padding: '5px 10px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px'
                            }}
                        >
                            ✓ Validate
                        </button>
                    )}

                    {isOwner && (
                        <button
                            onClick={() => onRevoke(ticket.id)}
                            style={{
                                backgroundColor: '#dc3545',
                                color: 'white',
                                border: 'none',
                                padding: '5px 10px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px'
                            }}
                        >
                            🗑️ Revoke
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};