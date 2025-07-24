"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import BotDemo from "./botDemo";
import BotReal from "./botReal";


export default function BotTrade() {
    const [isTest, setIsTest] = useState(false);

    return (
        <div>
            {isTest ? <BotDemo /> : <BotReal />}
        </div>
    )
}
