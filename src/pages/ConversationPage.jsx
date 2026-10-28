import { useParams } from 'react-router-dom';
import ChatWindow from '../components/ChatWindow.jsx';

export default function ConversationPage() {
  const { conversationId } = useParams();
  return <ChatWindow key={conversationId} conversationId={conversationId} />;
}
