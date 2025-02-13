import * as Path from 'path'
import dindist from 'dindist'
import { konn, providers } from 'konn'
import 'ts-replace-all'
import { project } from '../__providers__/project'
import { createPrismaSchema } from '../__helpers__/helpers'

const ctx = konn()
  .useBeforeAll(providers.dir())
  .useBeforeAll(providers.run())
  .useBeforeAll(project())
  .beforeAll((ctx) => {
    ctx.packageJson.merge({
      scripts: {
        build: 'prisma generate',
      },
      dependencies: {
        '@prisma/client': '4.0.0',
        graphql: '15.5.1',
        nexus: '1.1.0',
        prisma: '4.0.0',
      },
    })
    ctx.fs.write(
      `prisma/schema.prisma`,
      createPrismaSchema({
        content: dindist`
          model Foo {
            id  String  @id
          }
        `,
      })
    )
    ctx.runOrThrow(`${Path.join(process.cwd(), 'node_modules/.bin/yalc')} add ${ctx.thisPackageName}`)
    ctx.runOrThrow(`npm install --legacy-peer-deps`, { env: { PEER_DEPENDENCY_CHECK: 'false' } })
    return ctx
  })
  .done()

it('when project does not have ts-node installed nexus-prisma generator still generates if there are no TS generator config files present', async () => {
  const result = await ctx.runOrThrowPackageScript(`build`)
  expect(normalizeGeneratorOutput(result.stdout)).toMatchSnapshot()
})

const normalizeGeneratorOutput = (output: string) =>
  output
    .replaceAll(/(\d+|\d+(\.\d+))(ms|s)/g, '<SOME TIME><unit>')
    .replaceAll(/ to .* in /g, ' to <SOME PATH> in ')
    .replaceAll(/loaded from.*/g, 'loaded from <SOME PATH>')
    .replaceAll(/Generated Prisma Client \(.*\)/g, 'Generated Prisma Client (<SOME VERSION>)')
