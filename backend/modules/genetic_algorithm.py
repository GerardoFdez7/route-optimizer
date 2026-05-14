import random

def calculate_fitness(route, distance_matrix, mode):
    """
    Calcula el fitness y la distancia total real para una ruta dada.
    'route' es una permutación de los índices de destinos [1, 2, ..., N-1].
    El índice 0 siempre es el punto de origen.
    """
    distance = 0.0
    current_node = 0
    
    # Recorrido de los puntos intermedios
    for next_node in route:
        distance += distance_matrix[current_node][next_node]
        current_node = next_node
        
    # Si el modo es cerrado, sumar el costo de retorno al origen
    if mode == "closed":
        distance += distance_matrix[current_node][0]
        
    # El fitness es inversamente proporcional a la distancia
    # (A menor distancia, mayor fitness - sumamos epsilon para evitar divisiones por 0)
    fitness = 1.0 / (distance + 1e-6)
    return fitness, distance

def create_initial_population(pop_size, num_destinations):
    """Genera la población inicial con rutas aleatorias."""
    population = []
    # Los genes son los índices de los destinos, excepto el origen (0)
    base_route = list(range(1, num_destinations))
    
    for _ in range(pop_size):
        individual = base_route[:]
        random.shuffle(individual)
        population.append(individual)
        
    return population

def order_crossover(parent1, parent2):
    """
    Realiza Order Crossover (OX1), ideal para permutaciones,
    preservando el orden relativo para no repetir destinos.
    """
    size = len(parent1)
    start, end = sorted([random.randint(0, size - 1), random.randint(0, size - 1)])
    
    child = [-1] * size
    # Copiamos la subsección del padre 1
    child[start:end + 1] = parent1[start:end + 1]
    
    # Rellenamos los espacios vacíos con el padre 2, manteniendo el orden
    p2_idx = 0
    for i in range(size):
        if child[i] == -1:
            while parent2[p2_idx] in child:
                p2_idx += 1
            child[i] = parent2[p2_idx]
            
    return child

def mutate(individual, mutation_rate):
    """Aplica Swap Mutation aleatoriamente."""
    for i in range(len(individual)):
        if random.random() < mutation_rate:
            j = random.randint(0, len(individual) - 1)
            # Intercambiar dos destinos
            individual[i], individual[j] = individual[j], individual[i]
    return individual

def tournament_selection(population, fitnesses, k=3):
    """Selecciona un individuo al azar de una muestra aleatoria de tamaño 'k'."""
    selected_indices = random.sample(range(len(population)), k)
    best_idx = max(selected_indices, key=lambda idx: fitnesses[idx])
    return population[best_idx]

def run_genetic_algorithm(distance_matrix, mode="closed", pop_size=100, generations=200, mutation_rate=0.1):
    """
    Punto de entrada principal para el algoritmo genético.
    Retorna (best_route_sequence, shortest_distance).
    """
    num_destinations = len(distance_matrix)
    
    # Manejo de casos triviales (ej. solo el origen y 1 destino literal)
    if num_destinations <= 2:
        route = [1] if num_destinations == 2 else []
        _, dist = calculate_fitness(route, distance_matrix, mode)
        full_route = [0] + route + ([0] if mode == "closed" else [])
        return full_route, dist

    population = create_initial_population(pop_size, num_destinations)
    
    best_route_overall = None
    best_distance_overall = float('inf')
    
    for _ in range(generations):
        # Evaluar la población
        fitness_dist_pairs = [calculate_fitness(ind, distance_matrix, mode) for ind in population]
        fitnesses = [pair[0] for pair in fitness_dist_pairs]
        distances = [pair[1] for pair in fitness_dist_pairs]
        
        # Extraer el mejor individuo de la generación actual
        current_best_idx = distances.index(min(distances))
        if distances[current_best_idx] < best_distance_overall:
            best_distance_overall = distances[current_best_idx]
            best_route_overall = population[current_best_idx][:]
            
        new_population = []
        
        # Elitismo: asegurar que el mejor individuo pase a la nueva generación intacto
        new_population.append(population[current_best_idx])
        
        # Generar descendencia
        while len(new_population) < pop_size:
            p1 = tournament_selection(population, fitnesses)
            p2 = tournament_selection(population, fitnesses)
            child = order_crossover(p1, p2)
            child = mutate(child, mutation_rate)
            new_population.append(child)
            
        population = new_population
        
    # Construir el recorrido completo mapeado
    # Empieza en el origen [0], pasa por la mejor permutación y opcionalmente vuelve al origen [0]
    full_best_route = [0] + best_route_overall + ([0] if mode == "closed" else [])
    
    return full_best_route, best_distance_overall
