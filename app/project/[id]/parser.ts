export function parseMarkdownToApis(mdContent: string) {
    const apisToInsert: any[] = []

    function parseTableToSchema(rows: string[]) {
        const root: any = { type: 'object', properties: {}, required: [] }
        const stack: { level: number, parent: any, lastKey: string }[] = [{ level: -1, parent: root, lastKey: '' }]

        rows.forEach(row => {
            const parts = row.split('|').map(p => p.trim()).filter((_, idx) => idx > 0 && idx < 7)
            if (parts.length < 2) return

            const rawName = parts[0]
            const typeStr = parts[1]
            const isReq = parts[2]?.toLowerCase() === 'true'

            // Determine level by counting '»' characters
            const level = (rawName.match(/»/g) || []).length
            const cleanName = rawName.replace(/[»\s*]/g, '')

            if (!cleanName || cleanName === 'additionalProperties') return

            // Pop stack until we find the parent level
            while (stack.length > 1 && stack[stack.length - 1].level >= level) {
                stack.pop()
            }

            const currentParent = stack[stack.length - 1].parent
            const isArray = typeStr.includes('[') || typeStr.toLowerCase().includes('array')
            const baseType = typeStr.replace(/[\[\]]/g, '').toLowerCase()

            const prop: any = {
                type: baseType === 'object' || baseType === 'array' ? 'object' : baseType,
                isArray: isArray
            }

            // Handle schema references in type
            const schemaRefMatch = typeStr.match(/#schema(\w+)/)
            if (schemaRefMatch) {
                prop.$ref = `#/schemas/${schemaRefMatch[1].toLowerCase()}`
                delete prop.type
            }

            if (currentParent.properties) {
                currentParent.properties[cleanName] = prop
            } else if (currentParent.items) {
                if (!currentParent.items.properties) currentParent.items.properties = {}
                currentParent.items.properties[cleanName] = prop
            }

            if (isReq) {
                if (!currentParent.required) currentParent.required = []
                currentParent.required.push(cleanName)
            }

            // If it's a complex type, it might have children
            if (baseType === 'object' || isArray) {
                if (isArray) {
                    prop.type = 'array'
                    prop.items = { type: baseType === 'object' ? 'object' : baseType, properties: {} }
                    stack.push({ level, parent: prop.items, lastKey: cleanName })
                } else {
                    prop.properties = {}
                    stack.push({ level, parent: prop, lastKey: cleanName })
                }
            }
        })
        return root
    }

    // 1. Extract Schemas (Components)
    const components: any = { schemas: {} }
    const schemaSections = mdContent.split(/<h2 id="tocS_([^"]+)">/g)

    for (let i = 1; i < schemaSections.length; i += 2) {
        const schemaName = schemaSections[i]
        const schemaBody = schemaSections[i + 1]

        const tableStart = schemaBody.indexOf('|Name|Type|Required|Restrictions|Title|Description|')
        if (tableStart !== -1) {
            const lines = schemaBody.substring(tableStart).split('\n').map(l => l.trim()).filter(l => l.startsWith('|'))
            const dataLines = lines.slice(2) // Skip header and separator
            const schema = parseTableToSchema(dataLines)
            components.schemas[schemaName.toLowerCase()] = { ...schema, title: schemaName }
        }
    }

    // 2. Extract APIs
    const folders = mdContent.split(/^# /m)
    folders.forEach(folderSection => {
        const lines = folderSection.split('\n')
        const folderName = lines[0].trim()
        if (!folderName || folderName === "Authentication") return

        const apiSections = folderSection.split(/^## /m)
        apiSections.shift()

        apiSections.forEach(apiSection => {
            const apiLines = apiSection.split('\n')
            const header = apiLines[0].trim()
            const headerParts = header.split(/\s+/)
            if (headerParts.length < 2) return
            const method = headerParts[0].toUpperCase()
            const path = headerParts[1]

            const sectionContent = apiSection.trim()

            // Parameters
            const parameters: any[] = []
            let request_body: any = null

            const paramsMatch = sectionContent.match(/### Params[\s\S]*?\|Name\|Location\|Type\|Required\|Description\|[\s\S]*?\|---\|---\|---\|---\|---\|([\s\S]*?)(?=\n\n|\n#|$)/)
            if (paramsMatch) {
                paramsMatch[1].trim().split('\n').filter(l => l.trim()).forEach(row => {
                    const parts = row.split('|').map(p => p.trim()).filter((_, idx) => idx > 0 && idx < 6)
                    if (parts.length >= 4) {
                        const location = parts[1].toLowerCase()
                        const typeStr = parts[2]

                        if (location === 'body') {
                            const schemaRefMatch = typeStr.match(/#schema(\w+)/)
                            request_body = {
                                content: {
                                    "application/json": {
                                        schema: schemaRefMatch
                                            ? { "$ref": `#/schemas/${schemaRefMatch[1].toLowerCase()}` }
                                            : { type: typeStr.toLowerCase() }
                                    }
                                }
                            }
                        } else {
                            parameters.push({
                                name: parts[0],
                                in: location,
                                schema: { type: typeStr.toLowerCase() },
                                required: parts[3]?.toLowerCase().includes('yes') || parts[3]?.toLowerCase() === 'true',
                                description: parts[4] === 'none' ? '' : parts[4]
                            })
                        }
                    }
                })
            }

            if (!request_body) {
                const bodyMatch = sectionContent.match(/> Body Parameters[\s\S]*?```json\s+([\s\S]*?)```/)
                if (bodyMatch) {
                    try {
                        const example = JSON.parse(bodyMatch[1])
                        request_body = {
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: Object.keys(example).reduce((acc: any, key) => {
                                            acc[key] = { type: typeof example[key] }
                                            return acc
                                        }, {})
                                    }
                                }
                            }
                        }
                    } catch (e) { }
                }
            }

            const description = apiLines.length > 1 && !apiLines[1].trim().startsWith('>') && !apiLines[1].trim().startsWith('#')
                ? apiLines[1].trim()
                : ''

            // Responses
            const responses: any = {}
            const responsesMatch = sectionContent.match(/### Responses[\s\S]*?\|HTTP Status Code\s*\|Meaning\|Description\|Data schema\|[\s\S]*?\|---\|---\|---\|---\|([\s\S]*?)(?=\n\n|\n#|$)/)
            if (responsesMatch) {
                responsesMatch[1].trim().split('\n').filter(l => l.trim()).forEach(row => {
                    const parts = row.split('|').map(p => p.trim()).filter((_, idx) => idx > 0 && idx < 5)
                    if (parts.length >= 3) {
                        const code = parts[0]
                        const respDesc = parts[2] === 'none' ? '' : parts[2]
                        const schemaRefMatch = parts[3]?.match(/#schema(\w+)/)
                        const isInline = parts[3]?.toLowerCase() === 'inline'

                        responses[code] = {
                            description: respDesc,
                            content: isInline ? { "application/json": { schema: { type: "object" } } } : (schemaRefMatch ? {
                                "application/json": {
                                    schema: { "$ref": `#/schemas/${schemaRefMatch[1].toLowerCase()}` }
                                }
                            } : null)
                        }
                    }
                })
            }

            const inlineSchemaMatch = sectionContent.match(/### Responses Data Schema[\s\S]*?HTTP Status Code \*\*(\d+)\*\*[\s\S]*?\|Name\|Type\|Required\|Restrictions\|Title\|description\|[\s\S]*?\|---\|---\|---\|---\|---\|---\|([\s\S]*?)(?=\n\n|\n#|$)/)
            if (inlineSchemaMatch) {
                const code = inlineSchemaMatch[1]
                const rows = inlineSchemaMatch[2].trim().split('\n').filter(l => l.trim().startsWith('|'))
                const dataLines = rows.slice(2)
                const schema = parseTableToSchema(dataLines)

                if (responses[code]) {
                    responses[code].content["application/json"].schema = schema
                }
            }

            apisToInsert.push({
                path,
                method,
                summary: path,
                description,
                tags: [folderName],
                folder: folderName,
                parameters,
                request_body,
                responses,
                components,
                markdown_content: apiSection,
                original_spec: { "x-apidog-folder": folderName }
            })
        })
    })

    return apisToInsert
}
