export function generateInterface({ entity, enums = [], foreignIds = [], relatedEntities = [], to = { snake: str => str, slug: str => str } }) {
    const convertFieldType = ({ type }, enums) => {
        const typeMap = {
            'String': 'string',
            'Integer': 'number',
            'Long': 'number',
            'BigDecimal': 'number',
            'Float': 'number',
            'Double': 'number',
            'Boolean': 'Boolean',
            'LocalDate': 'string',
            'ZonedDateTime': 'string',
            'Instant': 'string',
            'TextBlob': 'string',
            'Blob': 'Blob',
            'ImageBlob': 'ImageBlob'
        };

        const enm = enums.reduce((res, e) => {
            if (e.name === type) {
                return 'keyof typeof ' + type;
            }
            return res;
        }, undefined);

        return typeMap[type] || enm || 'string';
    };

    // Helper function to check if a property is required
    const isRequired = (prop) => {
        if (!prop.validations) return false;
        return prop.validations.some(validation => validation.key === "required");
    };

    // Costruisce l'interfaccia
    let interfaceDefinition = {
        name: entity.name,
        properties: {
            id: 'number'
        }
    };

    // Aggiunge le proprietà dell'entità
    for (const prop of entity.body) {
        const baseType = ['Blob', 'ImageBlob'].includes(convertFieldType(prop, enums))
            ? 'string'
            : convertFieldType(prop, enums);

        interfaceDefinition.properties[to.snake(prop.name)] = baseType + (!isRequired(prop) ? ' | null' : '');

        // Aggiunge il contentType per Blob e ImageBlob
        if (['Blob', 'ImageBlob'].includes(convertFieldType(prop, enums))) {
            interfaceDefinition.properties[`${to.snake(prop.name)}ContentType`] =
                'string' + (!isRequired(prop) ? ' | null' : '');
        }
    }

    // Aggiunge gli ID delle chiavi esterne
    for (const { foreignId, nullable } of foreignIds) {
        interfaceDefinition.properties[foreignId] = 'number' + (nullable ? ' | null' : '');
    }

    // Aggiunge le entità correlate
    for (const { field, related, isArray } of relatedEntities) {
        interfaceDefinition.properties[field] = `I${related}${isArray ? '[]' : ''} | null`;
    }

    return interfaceDefinition;
}