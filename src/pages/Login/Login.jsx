import { useState } from 'react';
import { Anchor, Button, Center, Paper, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { login as saveToken, useAuth } from '../../auth/AuthContext.jsx';
import { validateEmail, validatePassword } from '../../auth/validation.js';
import { login, signup } from '../../api/endpoints/auth.js';
import { useMutation } from '../../hooks/useMutation.js';

export default function Login() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const { run: authenticate, loading } = useMutation(isSignup ? signup : login);

  const from = location.state?.from;
  const destination = from ? `${from.pathname}${from.search ?? ''}${from.hash ?? ''}` : '/';
  if (isAuthenticated) return <Navigate to={destination} replace />;

  const validate = () => ({
    email: validateEmail(email),
    // The backend checks the same 8-72 rule on login too.
    password: validatePassword(password),
    confirm: isSignup && confirmPassword !== password ? 'Passwords do not match' : null,
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    const token = await authenticate({ email: email.trim(), password });
    if (token) {
      saveToken(token.access_token);
      navigate(destination, { replace: true });
    }
  };

  const toggleMode = () => {
    setIsSignup(!isSignup);
    setErrors({});
  };

  return (
    <Center mih="100vh">
      <Paper withBorder p="xl" w={360} component="form" noValidate onSubmit={handleSubmit}>
        <Stack>
          <Title order={3}>{isSignup ? 'Create account' : 'Log in'}</Title>
          <TextInput label="Email" type="email" value={email} error={errors.email}
            onChange={(event) => setEmail(event.currentTarget.value)} />
          <PasswordInput label="Password" value={password} error={errors.password}
            onChange={(event) => setPassword(event.currentTarget.value)} />
          {isSignup && (
            <PasswordInput label="Confirm password" value={confirmPassword} error={errors.confirm}
              onChange={(event) => setConfirmPassword(event.currentTarget.value)} />
          )}
          <Button type="submit" loading={loading}>{isSignup ? 'Sign up' : 'Log in'}</Button>
          <Text size="sm" ta="center">
            <Anchor component="button" type="button" onClick={toggleMode}>
              {isSignup ? 'Already have an account? Log in' : 'No account? Sign up'}
            </Anchor>
          </Text>
        </Stack>
      </Paper>
    </Center>
  );
}
