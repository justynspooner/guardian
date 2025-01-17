import { ActionCallback, ExternalData } from '@policy-engine/helpers/decorators';
import { DocumentSignature, DocumentStatus } from '@guardian/interfaces';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { PolicyComponentsUtils } from '../policy-components-utils';
import { VcDocument } from '@hedera-modules';
import { VcHelper } from '@helpers/vcHelper';
import { getMongoRepository } from 'typeorm';
import { Schema as SchemaCollection } from '@entity/schema';
import { CatchErrors } from '@policy-engine/helpers/decorators/catch-errors';
import { PolicyOutputEventType } from '@policy-engine/interfaces';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';

/**
 * External data block
 */
@ExternalData({
    blockType: 'externalDataBlock',
    commonBlock: false,
    about: {
        label: 'External Data',
        title: `Add 'External Data' Block`,
        post: true,
        get: false,
        children: ChildrenType.None,
        control: ControlType.Server,
        input: null,
        output: [
            PolicyOutputEventType.RunEvent,
            PolicyOutputEventType.RefreshEvent
        ],
        defaultEvent: true
    }
})
export class ExternalDataBlock {
    
    @ActionCallback({
        output: [PolicyOutputEventType.RunEvent, PolicyOutputEventType.RefreshEvent]
    })
    @CatchErrors()
    async receiveData(data: any) {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        let verify: boolean;
        try {
            const VCHelper = new VcHelper();
            const res = await VCHelper.verifySchema(data.document);
            verify = res.ok;
            if (verify) {
                verify = await VCHelper.verifyVC(data.document);
            }
        } catch (error) {
            ref.error(`Verify VC: ${error.message}`)
            verify = false;
        }

        const signature = verify ? DocumentSignature.VERIFIED : DocumentSignature.INVALID;
        const vc = VcDocument.fromJsonTree(data.document);
        const doc = {
            hash: vc.toCredentialHash(),
            owner: data.owner,
            document: vc.toJsonTree(),
            status: DocumentStatus.NEW,
            signature: signature,
            policyId: ref.policyId,
            type: ref.options.entityType,
            schema: ref.options.schema
        };
        const state = { data: doc };
        ref.triggerEvents(PolicyOutputEventType.RunEvent, null, state);
        ref.triggerEvents(PolicyOutputEventType.RefreshEvent, null, state);
    }

    public async validate(resultsContainer: PolicyValidationResultsContainer): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        try {
            if (ref.options.schema) {
                if (typeof ref.options.schema !== 'string') {
                    resultsContainer.addBlockError(ref.uuid, 'Option "schema" must be a string');
                    return;
                }

                const schema = await getMongoRepository(SchemaCollection).findOne({ 
                    iri: ref.options.schema,
                    topicId: ref.topicId
                });
                if (!schema) {
                    resultsContainer.addBlockError(ref.uuid, `Schema with id "${ref.options.schema}" does not exist`);
                    return;
                }
            }
        } catch (error) {
            resultsContainer.addBlockError(ref.uuid, `Unhandled exception ${error.message}`);
        }
    }
}
