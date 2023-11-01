"use client";

import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import {
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import {
  ConnectWallet,
  useAddress,
  useContract,
  useContractMetadata,
  MediaRenderer,
  ThirdwebProvider,
} from "@thirdweb-dev/react";
import React, { useEffect, useState } from "react";

export default function Home() {
  return (
    <ThirdwebProvider
      activeChain="mumbai"
      clientId={process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID}
    >
      <PurchasePage />
    </ThirdwebProvider>
  );
}

function PurchasePage() {
  const address = useAddress();
  const { contract } = useContract(
    process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS,
    "edition"
  );
  const { data: contractMetadata } = useContractMetadata(contract);
  const [clientSecret, setClientSecret] = useState("");

  const onClick = async () => {
    const resp = await fetch("/api/stripe-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buyerWalletAddress: address,
      }),
    });
    if (resp.ok) {
      const json = await resp.json();
      setClientSecret(json.clientSecret);
    }
  };

  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    throw 'Did you forget to add a ".env.local" file?';
  }
  const stripe = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

  return (
    <main className="flex flex-col gap-y-8 items-center p-12">
      <ConnectWallet />

      {contractMetadata && (
        <div className="flex flex-col gap-8 border border-gray-700 rounded-xl p-12">
          <MediaRenderer
            className="rounded-lg"
            src={
              contractMetadata.image ||
              "ipfs://QmciR3WLJsf2BgzTSjbG5zCxsrEQ8PqsHK7JWGWsDSNo46/nft.png"
            }
          />

          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-extrabold">{contractMetadata.name}</h2>
            <p className="text-gray-500">
              {contractMetadata.description || "A description of your NFT."}
            </p>
          </div>

          {!clientSecret ? (
            <button
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-400 disabled:opacity-50"
              onClick={onClick}
              disabled={!address}
            >
              Buy with credit card
            </button>
          ) : (
            <Elements
              options={{
                clientSecret,
                appearance: { theme: "night" },
              }}
              stripe={stripe}
            >
              <CreditCardForm />
            </Elements>
          )}
        </div>
      )}
    </main>
  );
}

const CreditCardForm = () => {
  const elements = useElements();
  const stripe = useStripe();
  const [isLoading, setIsLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const onClick = async () => {
    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    try {
      const { paymentIntent, error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: "http://localhost:3000",
        },
        redirect: "if_required",
      });
      if (error) {
        throw error.message;
      }
      if (paymentIntent.status === "succeeded") {
        alert(
          "Payment success. The NFT will be delivered to your wallet shortly."
        );
        setIsCompleted(true);
      } else {
        alert("Payment failed. Please try again.");
      }
    } catch (e) {
      alert(`There was an error with the payment. ${e}`);
    }

    setIsLoading(false);
  };

  return (
    <>
      <PaymentElement />

      <button
        className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg w-full"
        onClick={onClick}
        disabled={isLoading || isCompleted || !stripe || !elements}
      >
        {isCompleted
          ? "Payment received"
          : isLoading
          ? "Please wait..."
          : "Pay now"}
      </button>
    </>
  );
};
