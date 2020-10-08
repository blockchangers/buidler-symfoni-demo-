/* eslint-disable react-hooks/exhaustive-deps */
import { providers, Signer, ethers } from "ethers";
import React, { useEffect, useState } from "react";
import Web3Modal, { IProviderOptions } from "web3modal";
import { Box, Text } from "grommet";
import { SpinnerCircular } from "spinners-react";

// contracts
// import SimpleStorageArtifact from "./buidler/artifacts/SimpleStorage.json";
import SimpleStorageDeployment from "./buidler/deployments/dev/SimpleStorage.json";
// import { SimpleStorage } from "./buidler/typechain/SimpleStorage";
import { SimpleStorageFactory } from "./buidler/typechain/SimpleStorageFactory";
import { SimpleStorage } from "./buidler/typechain/SimpleStorage";


interface SimpleStorageBuidler extends Contract {
    storage: any,
    instance?: SimpleStorage, // If we dont have an address for contract, it cannot be initiated. Maybe of type ethers.utils.Interface,
    factory?: SimpleStorageFactory, // If we dont have a signer, we cannot deploy a new factory

}
interface Contract {
    hasSigner: boolean,
    hasInstance: boolean
}

// export interface BuidlerSymfoniReactClass {
//     ready: () => boolean,
//     provider: providers.Provider,
//     signer: Promise<Signer>,
//     contracts: {
//         [contractName: string]: Contract
//     }
// }


// declare interface BuidlerSymfoniReact {
//     on(event: 'onReady', listener: (message: string) => void): this;
// }
// class BuidlerSymfoniReactClass extends EventEmitter {
//     public ready: boolean
//     public provider: providers.Provider
//     signer: Promise<Signer>

//     constructor() {
//         super()
//         this.signer = Promise.reject("No signer initiated");
//         this.initProvider()
//         // const providerFromConfig = new ethers.providers.JsonRpcProvider()
//     }



// }


/* Contexts */
type Contracts = { [contractName: string]: SimpleStorageBuidler | Contract }
const defaultContracts: Contracts = {}
export const ContractsContext = React.createContext<[Contracts, React.Dispatch<React.SetStateAction<Contracts>>]>([defaultContracts, () => { }]);


const SimpleStorageDefault: SimpleStorageBuidler = { storage: undefined, hasSigner: false, hasInstance: false }
export const SimpleStorageContext = React.createContext<[SimpleStorageBuidler, React.Dispatch<React.SetStateAction<SimpleStorageBuidler>>]>([SimpleStorageDefault, () => { }]);

const defaultProvider: providers.Provider = ethers.providers.getDefaultProvider()
export const ProviderContext = React.createContext<[providers.Provider, React.Dispatch<React.SetStateAction<providers.Provider>>]>([defaultProvider, () => { }]);

const defaultCurrentAddress: string = ""
export const CurrentAddressContext = React.createContext<[string, React.Dispatch<React.SetStateAction<string>>]>([defaultCurrentAddress, () => { }]);

const defaultSigner: Signer | undefined = undefined
export const SignerContext = React.createContext<[Signer | undefined, React.Dispatch<React.SetStateAction<Signer | undefined>>]>([defaultSigner, () => { }]);

interface Props { }

export const BuidlerSymfoniReact: React.FC<Props> = ({ children }) => {
    const [ready, setReady] = useState(false);
    const [messages, setMessages] = useState<string[]>([]);
    const [/* providerName */, setProviderName] = useState<string>();
    const [signer, setSigner] = useState<Signer | undefined>(defaultSigner);
    const [provider, setProvider] = useState<providers.Provider>(defaultProvider);
    const [contracts, setContracts] = useState<{ [contractName: string]: Contract }>(defaultContracts);
    const [SimpleStorage, setSimpleStorage] = useState<SimpleStorageBuidler>(SimpleStorageDefault);
    const [currentAddress, setCurrentAddress] = useState<string>(defaultCurrentAddress);

    /* functions */
    const getProvider = async (): Promise<providers.Provider | undefined> => {
        // TODO Should come from plugin
        const providerPriority = ["web3modal", "dev", "HTTP://127.0.0.1:8545"];

        const provider = await providerPriority.reduce(async (maybeProvider: Promise<providers.Provider | undefined>, providerIdentification) => {
            let foundProvider = await maybeProvider
            if (foundProvider) {
                return Promise.resolve(foundProvider)
            }
            else {
                switch (providerIdentification.toLowerCase()) {
                    case "web3modal":
                        try {
                            const provider = await getWeb3ModalProvider()
                            const web3provider = new ethers.providers.Web3Provider(provider);
                            return Promise.resolve(web3provider)
                        } catch (error) {
                            return Promise.resolve(undefined)
                        }
                    default:
                        return Promise.resolve(undefined)
                }
            }
        }, Promise.resolve(undefined)) // end reduce

        return provider
    }

    const getWeb3ModalProvider = async (): Promise<any> => {
        const providerOptions: IProviderOptions = {};
        const web3Modal = new Web3Modal({
            // network: "mainnet",
            cacheProvider: true,
            providerOptions, // required
        });
        return await web3Modal.connect();
    }

    useEffect(() => {
        console.log(messages.pop())
    }, [messages])

    /* effects */
    useEffect(() => {
        let subscribed = true
        const doAsync = async () => {
            setMessages(old => [...old, "Initiating Buidler React"])
            const provider = await getProvider() // getProvider can actually return undefined, see issue https://github.com/microsoft/TypeScript/issues/11094
            if (subscribed && provider) {
                setProvider(provider)
                setProviderName(provider.constructor.name)
                setMessages(old => [...old, "Useing provider: " + provider.constructor.name])
                // Web3Provider
                let signer;
                if (provider.constructor.name === "Web3Provider") {
                    const web3provider = provider as ethers.providers.Web3Provider
                    signer = await web3provider.getSigner()
                    if (subscribed && signer) {
                        setSigner(signer)
                        const address = await signer.getAddress()
                        if (subscribed && address) {
                            setCurrentAddress(address)
                        }
                    }
                }
                // ForEach Contract
                // contracts
                let contractAddress = null
                let instance = undefined
                if (SimpleStorageDeployment) {
                    contractAddress = SimpleStorageDeployment.receipt.contractAddress
                    instance = signer ? SimpleStorageFactory.connect(contractAddress, signer) : SimpleStorageFactory.connect(contractAddress, provider)
                }

                const contract: SimpleStorageBuidler = {
                    storage: null,
                    instance: instance,
                    factory: signer ? new SimpleStorageFactory(signer) : undefined,
                    hasSigner: signer ? true : false,
                    hasInstance: SimpleStorageDeployment ? true : false
                }
                setSimpleStorage(contract)


                // interface Contract {
                //     storage: any,
                //     contract: ethers.utils.Interface,
                //     factory: ContractFactory,
                //     ready: () => boolean,
                //     attach: (address: string) => Promise<Boolean>
                // }


                setReady(true)
            }
        };
        doAsync();
        return () => { subscribed = false }
    }, [])


    return (
        <ProviderContext.Provider value={[provider, setProvider]}>
            <SignerContext.Provider value={[signer, setSigner]}>
                <CurrentAddressContext.Provider value={[currentAddress, setCurrentAddress]}>
                    <SimpleStorageContext.Provider value={[SimpleStorage, setSimpleStorage]}>
                        {ready &&
                            (children)
                        }
                        {!ready &&
                            <Box align="center">
                                <SpinnerCircular></SpinnerCircular>
                                {messages.map((msg, i) => (
                                    <Text key={i}>{msg}</Text>
                                ))}
                            </Box>
                        }
                    </SimpleStorageContext.Provider>
                </CurrentAddressContext.Provider>
            </SignerContext.Provider>
        </ProviderContext.Provider>
    )
}



// cont buidlerPluginReact = {
// 	ready: () => boolean,
// 	provider: Ethers.provider,
// 	[contractName : HolisticContractObject] : {
// 		storage: {...HolisticObject} // If symfoni storage plugin is present,
// 		contract: TypechainContract (class instance with provider),
// 		factory: TypechainContractFactory (class instance with provider),
// 		ready: boolean,
// 		attach: (address: string) => Promise<Boolean>
// 	}
// }
