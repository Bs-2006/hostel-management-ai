import { Redirect } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import Loading from '../src/components/Loading';

export default function Index() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  return <Redirect href={user ? '/chat' : '/login'} />;
}