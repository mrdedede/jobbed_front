import { useState } from 'react';
import { Anchor, Button, Center, Paper, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { login as saveToken, useAuth } from '../../auth/AuthContext.jsx';
import { validateEmail, validatePassword } from '../../auth/validation.js';
import { login, signup } from '../../api/endpoints/auth.js';
import { useMutation } from '../../hooks/useMutation.js';
import { t } from '../../l10n.js';

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
    confirm: isSignup && confirmPassword !== password ? t('validation_passwords_mismatch') : null,
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
          <Title order={3}>{isSignup ? t('login_signup_title') : t('login_title')}</Title>
          <TextInput label={t('login_email')} type="email" value={email} error={errors.email}
            onChange={(event) => setEmail(event.currentTarget.value)} />
          <PasswordInput label={t('login_password')} value={password} error={errors.password}
            onChange={(event) => setPassword(event.currentTarget.value)} />
          {isSignup && (
            <PasswordInput label={t('login_confirm_password')} value={confirmPassword} error={errors.confirm}
              onChange={(event) => setConfirmPassword(event.currentTarget.value)} />
          )}
          <Button type="submit" loading={loading}>{isSignup ? t('login_signup_submit') : t('login_submit')}</Button>
          <Text size="sm" ta="center">
            <Anchor component="button" type="button" onClick={toggleMode}>
              {isSignup ? t('login_to_login') : t('login_to_signup')}
            </Anchor>
          </Text>
        </Stack>
      </Paper>
    </Center>
  );
}
