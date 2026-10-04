const projectRef = process.env.SUPABASE_PROJECT_REF || 'dycmubucexalixbtlbgp';
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

if (!accessToken) {
  console.error(
    'SUPABASE_ACCESS_TOKEN est requis. Defini-le dans .env ou dans l’environnement, puis reessayez.',
  );
  process.exit(1);
}

async function updateAuthConfig() {
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      MAILER_AUTOCONFIRM: true,
      ENABLE_CONFIRMATIONS: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Failed to update auth config (${response.status}):`, errorText);
  } else {
    const data = await response.json();
    console.log('✅ Supabase Auth config updated successfully:', data);
  }
}

updateAuthConfig();
