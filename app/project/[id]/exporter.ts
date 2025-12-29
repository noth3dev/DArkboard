
import { Api } from "./types"

export function exportToOpenAPI(apis: Api[], projectName: string) {
    const spec: any = {
        openapi: "3.0.0",
        info: {
            title: projectName,
            version: "1.0.0",
        },
        paths: {},
        components: {
            schemas: {}
        }
    }

    apis.forEach(api => {
        if (!spec.paths[api.path]) {
            spec.paths[api.path] = {}
        }

        spec.paths[api.path][api.method.toLowerCase()] = {
            summary: api.summary,
            description: api.description,
            tags: api.tags || (api.folder ? [api.folder] : []),
            parameters: api.parameters,
            requestBody: api.request_body,
            responses: api.responses
        }

        // Merge components if they exist
        if (api.components?.schemas) {
            Object.assign(spec.components.schemas, api.components.schemas)
        }
    })

    return JSON.stringify(spec, null, 2)
}

export function exportToMarkdown(apis: Api[], projectName: string) {
    let md = `# ${projectName} API Documentation\n\n`

    // Group by folder
    const grouped: Record<string, Api[]> = {}
    apis.forEach(api => {
        const folder = api.folder || "Ungrouped"
        if (!grouped[folder]) grouped[folder] = []
        grouped[folder].push(api)
    })

    Object.entries(grouped).forEach(([folder, folderApis]) => {
        md += `# ${folder}\n\n`
        folderApis.forEach(api => {
            md += `## ${api.method} ${api.path}\n\n`
            if (api.summary) md += `${api.summary}\n\n`
            if (api.description) md += `${api.description}\n\n`

            if (api.parameters && api.parameters.length > 0) {
                md += `### Params\n\n`
                md += `|Name|Location|Type|Required|Description|\n`
                md += `|---|---|---|---|---|\n`
                api.parameters.forEach((p: any) => {
                    md += `|${p.name}|${p.in}|${p.schema?.type || 'string'}|${p.required ? 'Yes' : 'No'}|${p.description || ''}|\n`
                })
                md += `\n`
            }

            if (api.request_body?.content?.['application/json']?.schema) {
                md += `### Request Body (application/json)\n\n`
                const schema = api.request_body.content['application/json'].schema
                if (schema.type === 'object' && schema.properties) {
                    md += `|Name|Type|Required|Description|\n`
                    md += `|---|---|---|---|\n`
                    Object.entries(schema.properties).forEach(([name, details]: [string, any]) => {
                        const required = schema.required?.includes(name) ? 'Yes' : 'No'
                        md += `|${name}|${details.type}|${required}|${details.description || ''}|\n`
                    })
                    md += `\n`
                } else if (schema.$ref) {
                    md += `Type: \`${schema.$ref}\`\n\n`
                }
            }

            if (api.responses) {
                md += `### Responses\n\n`
                md += `|HTTP Status Code|Meaning|Description|Data schema|\n`
                md += `|---|---|---|---|\n`
                Object.entries(api.responses).forEach(([code, details]: [string, any]) => {
                    const schema = details.content?.['application/json']?.schema
                    let schemaLabel = 'none'
                    if (schema?.$ref) schemaLabel = schema.$ref
                    else if (schema) schemaLabel = 'inline'

                    md += `|${code}|${details.description || ''}|${details.description || ''}|${schemaLabel}|\n`
                })
                md += `\n`
            }
        })
    })

    return md
}

export function downloadFile(content: string, filename: string, contentType: string) {
    const blob = new Blob([content], { type: contentType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}
