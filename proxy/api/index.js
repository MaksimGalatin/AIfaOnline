export default async function handler(req, res) {
  try {
    const tunnelUrl = process.env.TUNNEL_URL;
    if (!tunnelUrl) {
      return res.status(200).send('No tunnel url');
    }

    const response = await fetch(tunnelUrl + '/webhook/telegram', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Bypass-Tunnel-Reminder': 'true'
      },
      body: JSON.stringify(req.body)
    });
    
    res.status(200).send('OK');
  } catch (e) {
    console.error(e);
    res.status(200).send('OK');
  }
}
