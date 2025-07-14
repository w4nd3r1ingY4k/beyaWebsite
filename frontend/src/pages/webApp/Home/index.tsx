import CommandBChat from '../../webApp/CRM/inbox/components/CommandBChat';

const Homer: React.FC = () => {
  // Render a large CommandBChat instance for the home/chat page
  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      paddingTop: 32,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      background: '#FFFBFA',
    }}>
      <div style={{
        width: 900,
        height: `calc(100vh - 32px)`,
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'center',
      }}>
        <CommandBChat onClose={() => {}} width={900} disableCmdBShortcut={true} />
      </div>
    </div>
  );
};

export default Homer;