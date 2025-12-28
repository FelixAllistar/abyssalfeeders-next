import cron from 'node-cron';
import { scanAbyssalRegions } from './discovery';
import { updateAllCharacters } from './update-service';

export function initCronJobs() {
  console.log('Initializing cron jobs...');

  // Hourly check for new characters (at minute 0)
  cron.schedule('0 * * * *', async () => {
    console.log('Running hourly discovery scan...');
    try {
      await scanAbyssalRegions();
      console.log('Hourly discovery scan finished.');
    } catch (error) {
      console.error('Error during hourly discovery scan:', error);
    }
  });

  // Daily update of all characters (at midnight)
  cron.schedule('0 0 * * *', async () => {
    console.log('Running daily character update...');
    try {
      await updateAllCharacters();
      console.log('Daily character update finished.');
    } catch (error) {
      console.error('Error during daily character update:', error);
    }
  });

  console.log('Cron jobs scheduled: Hourly discovery (0 * * * *) and Daily update (0 0 * * *).');
}
