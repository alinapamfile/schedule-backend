const httpStatus = require('http-status-codes')
const supertest = require('supertest')
const mongoose = require('mongoose')
const db = require('../models')
const utils = require('../utils')
const Cryptr = require('cryptr')

const app = require('../server')

describe('GET /schedule', () => {
  let server, token

  beforeAll(async () => {
    server = supertest.agent(await app())

    let key = await db.Secret.findOne({
      env: process.env.NODE_ENV || 'dev',
      key: 'JWT_KEY'
    })

    key = new Cryptr(process.env.SECRET_KEY).decrypt(key.value)

    token = utils.createTkn({ _id: 777 }, key)
  })

  afterAll(async () => {
    await mongoose.disconnect()
  })
  describe('For FII', () => {
    let faculty
    beforeAll(async () => {
      faculty = await db.Faculty.findOne({
        shortName: 'FII'
      })
    })

    describe.skip('GET /schedule/rooms', () => {
      test('Should return the entire schedule', async () => {
        let schedule = await utils.getSchedule('./data/schedule.json')
        const response = await server
          .get('/schedule/rooms')
          .set('Authorization', `Bearer ${token}`)

        expect(response.status).toEqual(httpStatus.OK)
        expect(response.body).toHaveProperty('success')
        expect(response.body.success).toEqual(true)
        expect(response.body).toHaveProperty('schedule')
        expect(response.body.schedule).toEqual(schedule)
      })

      test('Should return the schedule for room C901', async () => {
        const response = await server
          .get('/schedule/rooms?r=C901')
          .set('Authorization', `Bearer ${token}`)

        expect(response.status).toEqual(httpStatus.OK)
        expect(response.body).toHaveProperty('success')
        expect(response.body.success).toEqual(true)
        expect(response.body).toHaveProperty('schedule')
        for (const sem in response.body.schedule) {
          for (const year in response.body.schedule[sem]) {
            for (const day in response.body.schedule[sem][year]) {
              for (const course in response.body.schedule[sem][year][day]) {
                expect(
                  response.body.schedule[sem][year][day][course]
                ).toHaveProperty('Sala')
                expect(
                  response.body.schedule[sem][year][day][course]['Sala']
                ).toEqual('C901')
              }
            }
          }
        }
      })

      test('Should return the schedule for rooms C2, C309 and C412', async () => {
        const response = await server
          .get('/schedule/rooms?r=C2,C309,C412')
          .set('Authorization', `Bearer ${token}`)

        expect(response.status).toEqual(httpStatus.OK)
        expect(response.body).toHaveProperty('success')
        expect(response.body.success).toEqual(true)
        expect(response.body).toHaveProperty('schedule')
        for (const sem in response.body.schedule) {
          for (const year in response.body.schedule[sem]) {
            for (const day in response.body.schedule[sem][year]) {
              for (const course in response.body.schedule[sem][year][day]) {
                expect(
                  response.body.schedule[sem][year][day][course]
                ).toHaveProperty('Sala')
                expect(['C2', 'C309', 'C412']).toContain(
                  response.body.schedule[sem][year][day][course]['Sala']
                )
              }
            }
          }
        }
      })

      test.skip('Should return null', async () => {
        const response = await server
          .get('/schedule/rooms?r=something%20that%20shouldnt%20be%20valid')
          .set('Authorization', `Bearer ${token}`)

        expect(response.status).toEqual(httpStatus.OK)
        expect(response.body).toHaveProperty('success')
        expect(response.body.success).toEqual(true)
        expect(response.body).toHaveProperty('schedule')
        expect(response.body.schedule).toBe(null)
      })
    })

    describe.skip('GET /schedule/year/:yearNumber', () => {
      test.each([1, 2, 3])(
        'Should return the schedule for year %i',
        async year => {
          const response = await server
            .get('/schedule/year/' + year)
            .set('Authorization', `Bearer ${token}`)

          expect(response.status).toEqual(httpStatus.OK)
          expect(response.body).toHaveProperty('success')
          expect(response.body.success).toEqual(true)
          expect(response.body).toHaveProperty('schedule')
          // deep check
          for (const sem in response.body.schedule) {
            for (const day in response.body.schedule[sem]) {
              for (const course in response.body.schedule[sem][day]) {
                expect(response.body.schedule[sem][day][course]).toHaveProperty(
                  'Grupa'
                )
                expect(
                  response.body.schedule[sem][day][course]['Grupa']
                ).toContain('I' + year)
              }
            }
          }
        }
      )

      test('Give wrong year number', async () => {
        const response = await server
          .get('/schedule/year/023235')
          .set('Authorization', `Bearer ${token}`)

        expect(response.status).toEqual(httpStatus.NOT_FOUND)
        expect(response.body).toHaveProperty('success')
        expect(response.body.success).toEqual(false)
        expect(response.body).toHaveProperty('message')
        expect(response.body.message).toEqual('Invalid year number')
      })

      test('Give no year number', async () => {
        const response = await server
          .get('/schedule/year/')
          .set('Authorization', `Bearer ${token}`)

        expect(response.status).toEqual(httpStatus.NOT_FOUND)
        expect(response.body).toHaveProperty('message')
        expect(response.body.message).toEqual(
          'Route /schedule/year/ Not found.'
        )
      })
    })

    describe.skip('GET /schedule/year/:yearNumber/semester/:semesterNumber', () => {
      test.each([
        [1, 1],
        [1, 2],
        [2, 1],
        [2, 2],
        [3, 1],
        [3, 2]
      ])(
        'Should return the schedule for year %d, semester %d',
        async (year, semester) => {
          const response = await server
            .get('/schedule/year/' + year + '/semester/' + semester)
            .set('Authorization', `Bearer ${token}`)

          expect(response.status).toEqual(httpStatus.OK)
          expect(response.body).toHaveProperty('success')
          expect(response.body.success).toEqual(true)
          expect(response.body).toHaveProperty('schedule')

          // can't really check whether the semester is right, hence there's no clear pattern in the response data. I'll check the year, though.
          for (const day in response.body.schedule) {
            for (const course in response.body.schedule[day]) {
              expect(response.body.schedule[day][course]).toHaveProperty(
                'Grupa'
              )
              expect(response.body.schedule[day][course]['Grupa']).toContain(
                'I' + year
              )
            }
          }
        }
      )

      test('Give wrong year number', async () => {
        const response = await server
          .get('/schedule/year/0/semester/1')
          .set('Authorization', `Bearer ${token}`)

        expect(response.status).toEqual(httpStatus.NOT_FOUND)
        expect(response.body).toHaveProperty('success')
        expect(response.body.success).toEqual(false)
        expect(response.body).toHaveProperty('message')
        expect(response.body.message).toEqual('Invalid year number')
      })

      test('Give wrong semester number', async () => {
        const response = await server
          .get('/schedule/year/1/semester/0')
          .set('Authorization', `Bearer ${token}`)

        expect(response.status).toEqual(httpStatus.NOT_FOUND)
        expect(response.body).toHaveProperty('success')
        expect(response.body.success).toEqual(false)
        expect(response.body).toHaveProperty('message')
        expect(response.body.message).toEqual('Invalid semester number')
      })
    })

    describe.skip('GET /schedule/year/:yearNumber/semester/:semesterNumber/group/:groupName', () => {
      test.skip('Should return schedule for the first semester, for I1E3', async () => {
        let doWeGetCourses = false
        const response = await server
          .get('/schedule/year/1/semester/1/group/E3')
          .set('Authorization', `Bearer ${token}`)

        expect(response.status).toEqual(httpStatus.OK)
        expect(response.body).toHaveProperty('success')
        expect(response.body.success).toEqual(true)
        expect(response.body).toHaveProperty('schedule')

        for (const day in response.body.schedule) {
          for (const course in response.body.schedule[day]) {
            if (response.body.schedule[day][course]['Tip'] === 'Curs') {
              expect(response.body.schedule[day][course]['Grupa']).toContain(
                'I1E'
              )
              doWeGetCourses = true
            } else
              expect(response.body.schedule[day][course]['Grupa']).toContain(
                'I1E3'
              )
          }
        }

        // finally, check that we do, in fact, also get the courses
        expect(doWeGetCourses).toEqual(true)
      })

      test('Give wrong year number', async () => {
        let doWeGetCourses = false
        const response = await server
          .get('/schedule/year/0/semester/1/group/E3')
          .set('Authorization', `Bearer ${token}`)

        expect(response.status).toEqual(httpStatus.NOT_FOUND)
        expect(response.body).toHaveProperty('success')
        expect(response.body.success).toEqual(false)
        expect(response.body).toHaveProperty('message')
        expect(response.body.message).toEqual('Invalid year number')
      })

      test('Give wrong semester number', async () => {
        let doWeGetCourses = false
        const response = await server
          .get('/schedule/year/1/semester/0/group/E3')
          .set('Authorization', `Bearer ${token}`)

        expect(response.status).toEqual(httpStatus.NOT_FOUND)
        expect(response.body).toHaveProperty('success')
        expect(response.body.success).toEqual(false)
        expect(response.body).toHaveProperty('message')
        expect(response.body.message).toEqual('Invalid semester number')
      })

      test('Give wrong group name', async () => {
        let doWeGetCourses = false
        const response = await server
          .get(
            '/schedule/year/1/semester/1/group/This%20should%20really%20not%20be%20here'
          )
          .set('Authorization', `Bearer ${token}`)

        expect(response.status).toEqual(httpStatus.NOT_FOUND)
        expect(response.body).toHaveProperty('success')
        expect(response.body.success).toEqual(false)
        expect(response.body).toHaveProperty('message')
        expect(response.body.message).toEqual('Invalid group name')
      })
    })

    describe('GET /schedule/', () => {
      test('provide no parameters', async () => {
        try {
          const response = await server
            .get('/schedule')
            .set('Authorization', `Bearer ${token}`)

          expect(response.status).toEqual(httpStatus.OK)
          expect(response.body).toHaveProperty('success')
          expect(response.body.success).toEqual(true)
          expect(response.body).toHaveProperty('schedule')
          expect(response.body.schedule).toBeInstanceOf(Object)
        } catch (error) {
          expect(error).toBeNull()
        }
      })

      test('provide wrong faculty', async () => {
        const response = await server
          .get('/schedule?faculty=FI')
          .set('Authorization', `Bearer ${token}`)

        expect(response.status).toEqual(httpStatus.BAD_REQUEST)
        expect(response.body).toHaveProperty('success')
        expect(response.body.success).toEqual(false)
        expect(response.body).toHaveProperty('message')
        expect(response.body.message).toEqual('Invalid query')
      })

      test('provide only faculty', async () => {
        const response = await server
          .get('/schedule?faculty=FII')
          .set('Authorization', `Bearer ${token}`)

        expect(response.status).toEqual(httpStatus.OK)
        expect(response.body).toHaveProperty('success')
        expect(response.body.success).toEqual(true)
        expect(response.body).toHaveProperty('schedule')
        expect(response.body.schedule).toHaveProperty('sem1Schedule')
        expect(response.body.schedule).toHaveProperty('sem2Schedule')
      })

      test('provide wrong semester', async () => {
        const response = await server
          .get('/schedule?faculty=FII&semester=0')
          .set('Authorization', `Bearer ${token}`)

        expect(response.status).toEqual(httpStatus.BAD_REQUEST)
        expect(response.body).toHaveProperty('success')
        expect(response.body.success).toEqual(false)
        expect(response.body).toHaveProperty('message')
        expect(response.body.message).toEqual('Invalid semester')
      })

      test('provide semester 1', async () => {
        const response = await server
          .get('/schedule?faculty=FII&semester=1')
          .set('Authorization', `Bearer ${token}`)

        expect(response.status).toEqual(httpStatus.OK)
        expect(response.body).toHaveProperty('success')
        expect(response.body.success).toEqual(true)
        expect(response.body.schedule).toHaveProperty('sem1Schedule')
        expect(response.body.schedule).not.toHaveProperty('sem2Schedule')
      })

      test('provide semester 2', async () => {
        const response = await server
          .get('/schedule?faculty=FII&semester=2')
          .set('Authorization', `Bearer ${token}`)

        expect(response.status).toEqual(httpStatus.OK)
        expect(response.body).toHaveProperty('success')
        expect(response.body.success).toEqual(true)
        expect(response.body.schedule).toHaveProperty('sem2Schedule')
        expect(response.body.schedule).not.toHaveProperty('sem1Schedule')
      })

      test('provide wrong year', async () => {
        const response = await server
          .get('/schedule?faculty=FII&year=0')
          .set('Authorization', `Bearer ${token}`)

        expect(response.status).toEqual(httpStatus.OK)
        expect(response.body).toHaveProperty('success')
        expect(response.body.success).toEqual(true)
        expect(response.body).toHaveProperty('schedule')
        expect(response.body.schedule).not.toBeNull()
      })

      test('provide year', async () => {
        const response = await server
          .get('/schedule?faculty=FII&year=1')
          .set('Authorization', `Bearer ${token}`)

        expect(response.status).toEqual(httpStatus.OK)
        expect(response.body).toHaveProperty('success')
        expect(response.body.success).toEqual(true)
        expect(response.body).toHaveProperty('schedule')
        expect(response.body.schedule).toHaveProperty('sem1Schedule')
        expect(response.body.schedule).toHaveProperty('sem2Schedule')
      })

      test('provide wrong day', async () => {
        const response = await server
          .get('/schedule?faculty=FII&day=9')
          .set('Authorization', `Bearer ${token}`)

        expect(response.status).toEqual(httpStatus.OK)
        expect(response.body).toHaveProperty('success')
        expect(response.body.success).toEqual(true)
        expect(response.body).toHaveProperty('schedule')

        // expect(response.body.schedule).toHaveProperty('sem1Schedule')
        // expect(response.body.schedule.sem1Schedule).toHaveProperty('1')
        // expect(response.body.schedule.sem1Schedule).toHaveProperty('2')
        // expect(response.body.schedule.sem1Schedule).toHaveProperty('3')

        // expect(response.body.schedule.sem1Schedule['1']).toHaveProperty('Luni')
        // expect(response.body.schedule.sem1Schedule['1']).toHaveProperty('Marti')
        // expect(response.body.schedule.sem1Schedule['1']).toHaveProperty('Miercuri')
        // expect(response.body.schedule.sem1Schedule['1']).toHaveProperty('Joi')
        // expect(response.body.schedule.sem1Schedule['1']).toHaveProperty('Vineri')

        // expect(response.body.schedule.sem1Schedule['2']).toHaveProperty('Luni')
        // expect(response.body.schedule.sem1Schedule['2']).toHaveProperty('Marti')
        // expect(response.body.schedule.sem1Schedule['2']).toHaveProperty('Miercuri')
        // expect(response.body.schedule.sem1Schedule['2']).toHaveProperty('Joi')
        // expect(response.body.schedule.sem1Schedule['2']).toHaveProperty('Vineri')

        // expect(response.body.schedule.sem1Schedule['3']).toHaveProperty('Luni')
        // expect(response.body.schedule.sem1Schedule['3']).toHaveProperty('Marti')
        // expect(response.body.schedule.sem1Schedule['3']).toHaveProperty('Miercuri')
        // expect(response.body.schedule.sem1Schedule['3']).toHaveProperty('Joi')
        // expect(response.body.schedule.sem1Schedule['3']).toHaveProperty('Vineri')

        // expect(response.body.schedule).toHaveProperty('sem2Schedule')
        // expect(response.body.schedule.sem2Schedule).toHaveProperty('1')
        // expect(response.body.schedule.sem2Schedule).toHaveProperty('2')
        // expect(response.body.schedule.sem2Schedule).toHaveProperty('3')

        // expect(response.body.schedule.sem2Schedule['1']).toHaveProperty('Luni')
        // expect(response.body.schedule.sem2Schedule['1']).toHaveProperty('Marti')
        // expect(response.body.schedule.sem2Schedule['1']).toHaveProperty('Miercuri')
        // expect(response.body.schedule.sem2Schedule['1']).toHaveProperty('Joi')
        // expect(response.body.schedule.sem2Schedule['1']).toHaveProperty('Vineri')

        // expect(response.body.schedule.sem2Schedule['2']).toHaveProperty('Luni')
        // expect(response.body.schedule.sem2Schedule['2']).toHaveProperty('Marti')
        // expect(response.body.schedule.sem2Schedule['2']).toHaveProperty('Miercuri')
        // expect(response.body.schedule.sem2Schedule['2']).toHaveProperty('Joi')
        // expect(response.body.schedule.sem2Schedule['2']).toHaveProperty('Vineri')

        // expect(response.body.schedule.sem2Schedule['3']).toHaveProperty('Luni')
        // expect(response.body.schedule.sem2Schedule['3']).toHaveProperty('Marti')
        // expect(response.body.schedule.sem2Schedule['3']).toHaveProperty('Miercuri')
        // expect(response.body.schedule.sem2Schedule['3']).toHaveProperty('Joi')
        // expect(response.body.schedule.sem2Schedule['3']).toHaveProperty('Vineri')
      })

      test('provide single day', async () => {
        const response = await server
          .get('/schedule?faculty=FII&day=1&semester=1')
          .set('Authorization', `Bearer ${token}`)

        expect(response.status).toEqual(httpStatus.OK)
        expect(response.body).toHaveProperty('success')
        expect(response.body.success).toEqual(true)
        expect(response.body).toHaveProperty('schedule')

        // expect(response.body.schedule).toHaveProperty('1')
        // expect(response.body.schedule).toHaveProperty('2')
        // expect(response.body.schedule).toHaveProperty('3')

        // expect(Array.isArray(response.body.schedule['1'])).toBe(true)
        // expect(Array.isArray(response.body.schedule['2'])).toBe(true)
        // expect(Array.isArray(response.body.schedule['3'])).toBe(true)
      })

      test('provide multiple days', async () => {
        const response = await server
          .get('/schedule?faculty=FII&day=1,2&semester=1')
          .set('Authorization', `Bearer ${token}`)

        expect(response.status).toEqual(httpStatus.OK)
        expect(response.body).toHaveProperty('success')
        expect(response.body.success).toEqual(true)
        expect(response.body).toHaveProperty('schedule')

        // expect(response.body.schedule).toHaveProperty('1')
        // expect(response.body.schedule).toHaveProperty('2')
        // expect(response.body.schedule).toHaveProperty('3')

        // expect(response.body.schedule['1']).toHaveProperty('Luni')
        // expect(response.body.schedule['1']).toHaveProperty('Marti')
        // expect(response.body.schedule['2']).toHaveProperty('Luni')
        // expect(response.body.schedule['2']).toHaveProperty('Marti')
        // expect(response.body.schedule['3']).toHaveProperty('Luni')
        // expect(response.body.schedule['3']).toHaveProperty('Marti')
      })

      test('provide wrong semiyear', async () => {
        const response = await server
          .get('/schedule?faculty=FII&semiyear=C')
          .set('Authorization', `Bearer ${token}`)

        expect(response.status).toEqual(httpStatus.OK)

        expect(response.body).toHaveProperty('success')
        expect(response.body.success).toEqual(true)
        expect(response.body).toHaveProperty('schedule')
        expect(response.body.schedule).toBeInstanceOf(Object)
      })

      test('provide semiyear', async () => {
        const response = await server
          .get('/schedule?faculty=FII&semiyear=E')
          .set('Authorization', `Bearer ${token}`)

        expect(response.status).toEqual(httpStatus.OK)

        expect(response.body).toHaveProperty('success')
        expect(response.body.success).toEqual(true)

        expect(response.body).toHaveProperty('schedule')
        expect(response.body.schedule).toBeInstanceOf(Object)

        // deep check
        // for (const sem in response.body.schedule)
        //   for (const year in response.body.schedule[sem])
        //     for (const day in response.body.schedule[sem][year])
        //       for (const course in response.body.schedule[sem][year][day])
        //         expect(
        //           response.body.schedule[sem][year][day][course]['Grupa']
        //         ).toContain('E')
      })

      test('provide non-numerical group', async () => {
        const response = await server
          .get('/schedule?faculty=FII&semiyear=E&group=E')
          .set('Authorization', `Bearer ${token}`)

        expect(response.status).toEqual(httpStatus.OK)

        expect(response.body).toHaveProperty('success')
        expect(response.body.success).toEqual(true)

        expect(response.body).toHaveProperty('schedule')
        expect(response.body.schedule).toBeInstanceOf(Object)
      })

      test('provide bad group number', async () => {
        const response = await server
          .get('/schedule?faculty=FII&semiyear=E&group=0')
          .set('Authorization', `Bearer ${token}`)

        expect(response.status).toEqual(httpStatus.OK)

        expect(response.body).toHaveProperty('success')
        expect(response.body.success).toEqual(true)

        expect(response.body).toHaveProperty('schedule')
        expect(response.body.schedule).toBeInstanceOf(Object)

        // deep check
        // for (const sem in response.body.schedule)
        //   for (const year in response.body.schedule[sem])
        //     for (const day in response.body.schedule[sem][year])
        //       for (const course in response.body.schedule[sem][year][day])
        //         expect(
        //           response.body.schedule[sem][year][day][course]['Tip']
        //         ).toEqual('Curs')
      })

      test('provide group number', async () => {
        let doWeGetCourses = false
        const response = await server
          .get('/schedule?faculty=FII&semiyear=E&group=3')
          .set('Authorization', `Bearer ${token}`)

        expect(response.status).toEqual(httpStatus.OK)

        expect(response.body).toHaveProperty('success')
        expect(response.body.success).toEqual(true)

        expect(response.body).toHaveProperty('schedule')
        expect(response.body.schedule).toBeInstanceOf(Object)

        // deep check

        // for (const sem in response.body.schedule) {
        //   for (const year in response.body.schedule[sem]) {
        //     for (const day in response.body.schedule[sem][year]) {
        //       for (const course in response.body.schedule[sem][year][day]) {
        //         if (
        //           response.body.schedule[sem][year][day][course]['Tip'] ===
        //           'Curs'
        //         ) {
        //           expect(
        //             response.body.schedule[sem][year][day][course]['Grupa']
        //           ).toContain('E')
        //           doWeGetCourses = true
        //         } else
        //           expect(
        //             response.body.schedule[sem][year][day][course]['Grupa']
        //           ).toContain('E3')
        //       }
        //     }
        //   }
        // }

        // final check for courses
        // expect(doWeGetCourses).toEqual(true)
      })

      test('provide wrong room', async () => {
        const response = await server
          .get('/schedule?room=-1')
          .set('Authorization', `Bearer ${token}`)

        expect(response.status).toEqual(httpStatus.OK)

        expect(response.body).toHaveProperty('success')
        expect(response.body.success).toEqual(true)

        expect(response.body).toHaveProperty('schedule')
        expect(response.body.schedule).toBeInstanceOf(Object)
      })

      test('provide room C210', async () => {
        const response = await server
          .get('/schedule?room=C210&faculty=FII')
          .set('Authorization', `Bearer ${token}`)

        expect(response.status).toEqual(httpStatus.OK)

        expect(response.body).toHaveProperty('success')
        expect(response.body.success).toEqual(true)

        expect(response.body).toHaveProperty('schedule')
        expect(response.body.schedule).toBeInstanceOf(Object)

        // deep check

        // for (const sem in response.body.schedule)
        //   for (const year in response.body.schedule[sem])
        //     for (const day in response.body.schedule[sem][year])
        //       for (const course in response.body.schedule[sem][year][day])
        //         expect(
        //           response.body.schedule[sem][year][day][course]['Sala']
        //         ).toContain('C210')
      })
    })
  })
})
