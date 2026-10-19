import { useState } from 'react';
import { Anchor, Button, Center, Paper, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { login as saveToken, useAuth } from '../../auth/AuthContext.jsx';
import { login, signup } from '../../api/endpoints/auth.js';
import { useMutation } from '../../hooks/useMutation.js';

export default function Login() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { run: authenticate, loading } = useMutation(isSignup ? signup : login);

  const destination = location.state?.from?.pathname ?? '/';
  if (isAuthenticated) return <Navigate to={destination} replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    const token = await authenticate({ email, password });
    if (token) {
      saveToken(token.access_token);
      navigate(destination, { replace: true });
    }
  };

  return (
    <Center mih="100vh">
      <Paper withBorder p="xl" w={360} component="form" onSubmit={handleSubmit}>
        <Stack>
          <Title order={3}>{isSignup ? 'Create account' : 'Log in'}</Title>
          <TextInput label="Email" type="email" required value={email}
            onChange={(event) => setEmail(event.currentTarget.value)} />
          <PasswordInput label="Password" required minLength={8} maxLength={72} value={password}
            onChange={(event) => setPassword(event.currentTarget.value)} />
          <Button type="submit" loading={loading}>{isSignup ? 'Sign up' : 'Log in'}</Button>
          <Text size="sm" ta="center">
            <Anchor component="button" type="button" onClick={() => setIsSignup(!isSignup)}>
              {isSignup ? 'Already have an account? Log in' : 'No account? Sign up'}
            </Anchor>
          </Text>
        </Stack>
      </Paper>
    </Center>
  );
}
