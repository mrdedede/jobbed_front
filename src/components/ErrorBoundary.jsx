import { Component } from 'react';
import { Alert, Button, Stack, Text } from '@mantine/core';

/**
 * Catches render errors in a page, so one broken page does not blank the
 * whole app. Give it `key={location.pathname}` to reset on navigation.
 */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error(error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <Alert color="red" title="Something went wrong on this page" role="alert">
        <Stack gap="xs" align="flex-start">
          <Text size="sm">{this.state.error.message}</Text>
          <Button size="xs" variant="light" onClick={() => this.setState({ error: null })}>
            Try again
          </Button>
        </Stack>
      </Alert>
    );
  }
}
