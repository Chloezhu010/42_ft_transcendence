/**
 * Tests for authentication API functionality.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { login, logout, signup } from '@client-api';
