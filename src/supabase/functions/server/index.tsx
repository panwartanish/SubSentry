import { Hono } from 'npm:hono@4';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

const app = new Hono();

// Middleware
app.use('*', logger(console.log));
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Health check
app.get('/make-server-b0eb9ae0/health', (c) => {
  return c.json({ status: 'ok', message: 'SubSentry API is running' });
});

// ============================================
// AUTHENTICATION ROUTES
// ============================================

// Sign up - Create new user with Supabase Auth
app.post('/make-server-b0eb9ae0/auth/signup', async (c) => {
  try {
    const { name, email, password } = await c.req.json();
    
    if (!name || !email || !password) {
      return c.json({ error: 'Name, email, and password are required' }, 400);
    }
    
    // Check if user already exists
    const existingUser = await kv.get(`user:${email}`);
    if (existingUser) {
      return c.json({ error: 'User already exists. Please login instead.' }, 409);
    }
    
    // Create user in Supabase Auth
    // Note: Automatically confirm email since email server hasn't been configured
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      email_confirm: true
    });
    
    if (error) {
      console.log('Supabase Auth error during signup:', error);
      return c.json({ error: error.message }, 400);
    }
    
    // Store user data in KV store
    const userData = {
      id: data.user.id,
      name,
      email,
      preferredCurrency: 'USD',
      createdAt: new Date().toISOString(),
      authProvider: 'email'
    };
    
    await kv.set(`user:${email}`, userData);
    await kv.set(`user:id:${data.user.id}`, userData);
    
    return c.json({ 
      user: userData,
      message: 'Account created successfully'
    });
  } catch (error) {
    console.log('Error during signup:', error);
    return c.json({ error: 'Failed to create account' }, 500);
  }
});

// Login - Authenticate existing user
app.post('/make-server-b0eb9ae0/auth/login', async (c) => {
  try {
    const { email, password } = await c.req.json();
    
    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }
    
    // Authenticate with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      console.log('Supabase Auth error during login:', error);
      return c.json({ error: 'Invalid email or password' }, 401);
    }
    
    // Get user data from KV store
    let userData = await kv.get(`user:${email}`);
    
    // If user data doesn't exist, create it (for legacy users)
    if (!userData) {
      userData = {
        id: data.user.id,
        name: data.user.user_metadata?.name || email.split('@')[0],
        email,
        preferredCurrency: 'USD',
        createdAt: new Date().toISOString(),
        authProvider: 'email'
      };
      await kv.set(`user:${email}`, userData);
      await kv.set(`user:id:${data.user.id}`, userData);
    }
    
    return c.json({ 
      user: userData,
      session: data.session,
      access_token: data.session.access_token
    });
  } catch (error) {
    console.log('Error during login:', error);
    return c.json({ error: 'Failed to login' }, 500);
  }
});

// Google OAuth callback - Handle Google sign-in
app.post('/make-server-b0eb9ae0/auth/google', async (c) => {
  try {
    const { access_token } = await c.req.json();
    
    if (!access_token) {
      return c.json({ error: 'Access token is required' }, 400);
    }
    
    // Get user from access token
    const { data: { user: authUser }, error } = await supabase.auth.getUser(access_token);
    
    if (error || !authUser) {
      console.log('Error getting user from token:', error);
      return c.json({ error: 'Invalid access token' }, 401);
    }
    
    const email = authUser.email;
    const name = authUser.user_metadata?.full_name || authUser.user_metadata?.name || email?.split('@')[0];
    
    // Check if user exists, if not create
    let userData = await kv.get(`user:${email}`);
    
    if (!userData) {
      userData = {
        id: authUser.id,
        name,
        email,
        preferredCurrency: 'USD',
        createdAt: new Date().toISOString(),
        authProvider: 'google',
        avatar: authUser.user_metadata?.avatar_url
      };
      
      await kv.set(`user:${email}`, userData);
      await kv.set(`user:id:${authUser.id}`, userData);
    }
    
    return c.json({ 
      user: userData,
      access_token
    });
  } catch (error) {
    console.log('Error during Google auth:', error);
    return c.json({ error: 'Failed to authenticate with Google' }, 500);
  }
});

// Verify session
app.post('/make-server-b0eb9ae0/auth/verify', async (c) => {
  try {
    const { access_token } = await c.req.json();
    
    if (!access_token) {
      return c.json({ error: 'Access token is required' }, 400);
    }
    
    const { data: { user: authUser }, error } = await supabase.auth.getUser(access_token);
    
    if (error || !authUser) {
      return c.json({ error: 'Invalid or expired session' }, 401);
    }
    
    const userData = await kv.get(`user:${authUser.email}`);
    
    return c.json({ user: userData, valid: true });
  } catch (error) {
    console.log('Error verifying session:', error);
    return c.json({ error: 'Failed to verify session' }, 500);
  }
});

// ============================================
// USER ROUTES
// ============================================

// Get user data
app.get('/make-server-b0eb9ae0/user/:email', async (c) => {
  try {
    const email = c.req.param('email');
    const userData = await kv.get(`user:${email}`);
    
    if (!userData) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    return c.json({ user: userData });
  } catch (error) {
    console.log('Error fetching user:', error);
    return c.json({ error: 'Failed to fetch user data' }, 500);
  }
});

// Update user preferences
app.put('/make-server-b0eb9ae0/user/:email/preferences', async (c) => {
  try {
    const email = c.req.param('email');
    const { preferredCurrency } = await c.req.json();
    
    const userData = await kv.get(`user:${email}`);
    
    if (!userData) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    userData.preferredCurrency = preferredCurrency;
    await kv.set(`user:${email}`, userData);
    
    return c.json({ user: userData });
  } catch (error) {
    console.log('Error updating user preferences:', error);
    return c.json({ error: 'Failed to update preferences' }, 500);
  }
});

// ============================================
// SUBSCRIPTION ROUTES
// ============================================

// Get all subscriptions for a user
app.get('/make-server-b0eb9ae0/subscriptions/:email', async (c) => {
  try {
    const email = c.req.param('email');
    const subscriptions = await kv.get(`subscriptions:${email}`);
    
    return c.json({ subscriptions: subscriptions || [] });
  } catch (error) {
    console.log('Error fetching subscriptions:', error);
    return c.json({ error: 'Failed to fetch subscriptions' }, 500);
  }
});

// Add a new subscription
app.post('/make-server-b0eb9ae0/subscriptions/:email', async (c) => {
  try {
    const email = c.req.param('email');
    const newSubscription = await c.req.json();
    
    // Validate subscription data
    if (!newSubscription.name || !newSubscription.cost || !newSubscription.renewalDate) {
      return c.json({ error: 'Missing required subscription fields' }, 400);
    }
    
    // Get existing subscriptions
    let subscriptions = await kv.get(`subscriptions:${email}`) || [];
    
    // Add new subscription with timestamp ID
    const subscription = {
      ...newSubscription,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    
    subscriptions.push(subscription);
    
    // Save updated subscriptions
    await kv.set(`subscriptions:${email}`, subscriptions);
    
    return c.json({ subscription, subscriptions });
  } catch (error) {
    console.log('Error adding subscription:', error);
    return c.json({ error: 'Failed to add subscription' }, 500);
  }
});

// Update a subscription
app.put('/make-server-b0eb9ae0/subscriptions/:email/:id', async (c) => {
  try {
    const email = c.req.param('email');
    const id = c.req.param('id');
    const updatedData = await c.req.json();
    
    // Get existing subscriptions
    let subscriptions = await kv.get(`subscriptions:${email}`) || [];
    
    // Find and update the subscription
    const index = subscriptions.findIndex((sub: any) => sub.id === id);
    
    if (index === -1) {
      return c.json({ error: 'Subscription not found' }, 404);
    }
    
    subscriptions[index] = {
      ...subscriptions[index],
      ...updatedData,
      updatedAt: new Date().toISOString()
    };
    
    // Save updated subscriptions
    await kv.set(`subscriptions:${email}`, subscriptions);
    
    return c.json({ subscription: subscriptions[index], subscriptions });
  } catch (error) {
    console.log('Error updating subscription:', error);
    return c.json({ error: 'Failed to update subscription' }, 500);
  }
});

// Delete a subscription
app.delete('/make-server-b0eb9ae0/subscriptions/:email/:id', async (c) => {
  try {
    const email = c.req.param('email');
    const id = c.req.param('id');
    
    // Get existing subscriptions
    let subscriptions = await kv.get(`subscriptions:${email}`) || [];
    
    // Filter out the subscription to delete
    const filteredSubscriptions = subscriptions.filter((sub: any) => sub.id !== id);
    
    if (filteredSubscriptions.length === subscriptions.length) {
      return c.json({ error: 'Subscription not found' }, 404);
    }
    
    // Save updated subscriptions
    await kv.set(`subscriptions:${email}`, filteredSubscriptions);
    
    return c.json({ message: 'Subscription deleted', subscriptions: filteredSubscriptions });
  } catch (error) {
    console.log('Error deleting subscription:', error);
    return c.json({ error: 'Failed to delete subscription' }, 500);
  }
});

// Delete all subscriptions for a user (for testing/cleanup)
app.delete('/make-server-b0eb9ae0/subscriptions/:email', async (c) => {
  try {
    const email = c.req.param('email');
    await kv.set(`subscriptions:${email}`, []);
    
    return c.json({ message: 'All subscriptions deleted' });
  } catch (error) {
    console.log('Error deleting all subscriptions:', error);
    return c.json({ error: 'Failed to delete subscriptions' }, 500);
  }
});

// ============================================
// ANALYTICS ROUTES
// ============================================

// Get subscription statistics
app.get('/make-server-b0eb9ae0/analytics/:email', async (c) => {
  try {
    const email = c.req.param('email');
    const subscriptions = await kv.get(`subscriptions:${email}`) || [];
    
    // Calculate statistics
    const stats = {
      totalSubscriptions: subscriptions.length,
      totalMonthlyCost: subscriptions.reduce((sum: number, sub: any) => sum + sub.cost, 0),
      totalAnnualCost: subscriptions.reduce((sum: number, sub: any) => sum + (sub.cost * 12), 0),
      categoryBreakdown: {} as any,
      currencyBreakdown: {} as any,
      upcomingRenewals: [] as any[]
    };
    
    // Calculate category breakdown
    subscriptions.forEach((sub: any) => {
      const category = sub.category || 'Other';
      stats.categoryBreakdown[category] = (stats.categoryBreakdown[category] || 0) + sub.cost;
      
      const currency = sub.currency || 'USD';
      stats.currencyBreakdown[currency] = (stats.currencyBreakdown[currency] || 0) + sub.cost;
    });
    
    // Find upcoming renewals (within 7 days)
    const today = new Date();
    stats.upcomingRenewals = subscriptions.filter((sub: any) => {
      const renewalDate = new Date(sub.renewalDate);
      const daysUntil = Math.ceil((renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntil >= 0 && daysUntil <= 7;
    });
    
    return c.json({ stats });
  } catch (error) {
    console.log('Error fetching analytics:', error);
    return c.json({ error: 'Failed to fetch analytics' }, 500);
  }
});

// ============================================
// EXPORT ROUTES
// ============================================

// Export subscriptions data
app.get('/make-server-b0eb9ae0/export/:email', async (c) => {
  try {
    const email = c.req.param('email');
    const format = c.req.query('format') || 'json';
    
    const subscriptions = await kv.get(`subscriptions:${email}`) || [];
    
    if (format === 'csv') {
      // Generate CSV
      const headers = ['Name', 'Cost', 'Currency', 'Category', 'Renewal Date'];
      const rows = subscriptions.map((sub: any) => [
        sub.name,
        sub.cost.toFixed(2),
        sub.currency,
        sub.category,
        sub.renewalDate
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map((row: any) => row.join(','))
      ].join('\n');
      
      return c.text(csvContent, 200, {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="subscriptions-${new Date().toISOString().split('T')[0]}.csv"`
      });
    }
    
    return c.json({ subscriptions });
  } catch (error) {
    console.log('Error exporting data:', error);
    return c.json({ error: 'Failed to export data' }, 500);
  }
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Route not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.log('Server error:', err);
  return c.json({ error: 'Internal server error', message: err.message }, 500);
});

Deno.serve(app.fetch);
