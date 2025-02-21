import Event from '@ioc:Adonis/Core/Event'
import { Queue } from '@ioc:Rlanz/Queue'

Event.on('new:user', async (user) => {
  await Queue.dispatch('App/Jobs/SendNotifMailWelcome', user)
  await Queue.dispatch('App/Jobs/SendNotifMailAdminNewUser', user)
})

Event.on('new:invitation', async ({ user, project }) => {
  await Queue.dispatch('App/Jobs/SendNotifMailAttchProj', { user, project })
  await Queue.dispatch('App/Jobs/SendNotifMailAdminUserAddedProject', { user, project })
})

Event.on('send:report', async (data) => {
  await Queue.dispatch('App/Jobs/GenerateReport', data)
})
