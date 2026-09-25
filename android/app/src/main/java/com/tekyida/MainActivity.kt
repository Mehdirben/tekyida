package com.tekyida

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

object TekyidaAppLogic {
    fun formatGreeting(name: String): String = "Welcome to $name!"

    fun calculateNetBalance(amounts: List<Double>): Double = amounts.sum()

    fun isDebtSettled(netBalance: Double): Boolean = kotlin.math.abs(netBalance) < 0.001
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    Greeting("Tekyida")
                }
            }
        }
    }
}

@Composable
fun Greeting(name: String) {
    Text(text = TekyidaAppLogic.formatGreeting(name))
}
