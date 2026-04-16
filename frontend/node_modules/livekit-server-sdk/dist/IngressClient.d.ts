import { IngressAudioOptions, IngressInfo, IngressInput, IngressVideoOptions } from './proto/livekit_ingress';
import ServiceBase from './ServiceBase';
export interface CreateIngressOptions {
    /**
     * ingress name. optional
     */
    name?: string;
    /**
     * name of the room to send media to. optional
     */
    roomName?: string;
    /**
     * unique identity of the participant. optional
     */
    participantIdentity?: string;
    /**
     * participant display name
     */
    participantName?: string;
    /**
     * custom audio encoding parameters. optional
     */
    audio?: IngressAudioOptions;
    /**
     * custom video encoding parameters. optional
     */
    video?: IngressVideoOptions;
}
export interface UpdateIngressOptions {
    /**
     * ingress name. optional
     */
    name: string;
    /**
     * name of the room to send media to. optional
     */
    roomName?: string;
    /**
     * unique identity of the participant. optional
     */
    participantIdentity?: string;
    /**
     * participant display name
     */
    participantName?: string;
    /**
     * custom audio encoding parameters. optional
     */
    audio?: IngressAudioOptions;
    /**
     * custom video encoding parameters. optional
     */
    video?: IngressVideoOptions;
}
/**
 * Client to access Ingress APIs
 */
export declare class IngressClient extends ServiceBase {
    private readonly rpc;
    /**
     * @param host hostname including protocol. i.e. 'https://cluster.livekit.io'
     * @param apiKey API Key, can be set in env var LIVEKIT_API_KEY
     * @param secret API Secret, can be set in env var LIVEKIT_API_SECRET
     */
    constructor(host: string, apiKey?: string, secret?: string);
    /**
     * @param inputType protocol for the ingress
     * @param opts CreateIngressOptions
     */
    createIngress(inputType: IngressInput, opts?: CreateIngressOptions): Promise<IngressInfo>;
    /**
     * @param ingressId ID of the ingress to update
     * @param opts UpdateIngressOptions
     */
    updateIngress(ingressId: string, opts: UpdateIngressOptions): Promise<IngressInfo>;
    /**
     * @param roomName list ingress for one room only
     */
    listIngress(roomName?: string): Promise<Array<IngressInfo>>;
    /**
     * @param ingressId ingress to delete
     */
    deleteIngress(ingressId: string): Promise<IngressInfo>;
}
