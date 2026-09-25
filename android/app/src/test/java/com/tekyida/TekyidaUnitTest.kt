package com.tekyida

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class TekyidaUnitTest {

    @Test
    fun testGreetingMessage() {
        val greeting = TekyidaAppLogic.formatGreeting("Tekyida")
        assertEquals("Welcome to Tekyida!", greeting)
    }

    @Test
    fun testNetBalanceCalculation() {
        val txs = listOf(15.50, -5.50, 10.00)
        val net = TekyidaAppLogic.calculateNetBalance(txs)
        assertEquals(20.00, net, 0.0001)
    }

    @Test
    fun testDebtSettledStatus() {
        assertTrue(TekyidaAppLogic.isDebtSettled(0.00001))
        assertFalse(TekyidaAppLogic.isDebtSettled(12.50))
    }
}
