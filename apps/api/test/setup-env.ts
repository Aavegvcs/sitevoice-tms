import { tmpdir } from 'os';
import { join } from 'path';

// Tests run against their own database (create it and seed it with SEED_PASSWORD=Test@1234).
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://complaint:complaint@localhost:5434/sitevoice_test?schema=public';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.UPLOAD_DIR = join(tmpdir(), 'sitevoice-test-uploads');
process.env.LOGIN_RATE_LIMIT = '1000';
