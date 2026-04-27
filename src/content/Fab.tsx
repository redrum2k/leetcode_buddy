interface FabProps {
  onClick: () => void;
}

export function Fab({ onClick }: FabProps) {
  return (
    <button
      onClick={onClick}
      title="Open Leetcode Buddy"
      style={{
        position: 'fixed',
        top: '80px',
        right: '16px',
        zIndex: 2147483647,
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        backgroundColor: '#f89f1b',
        color: '#ffffff',
        border: 'none',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: 'bold',
        fontFamily: 'Arial, sans-serif',
        boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'transform 0.15s, box-shadow 0.15s',
        lineHeight: '1',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.1)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.45)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.35)';
      }}
    >
      LB
    </button>
  );
}
